import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
const root = path.resolve(__dirname, "../../..");
const password = readFileSync(path.join(root, "apps/api/.env"), "utf8")
  .match(/^DEMO_PASSWORD=(.+)$/m)?.[1]
  .trim();
async function login(page: Page, email: string) {
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/home");
}
function fixture() {
  return JSON.parse(
    execFileSync(
      "php",
      [
        "-d",
        "extension=pdo_pgsql",
        path.join(root, "infrastructure/scripts/e2e-social-fixture.php"),
        Date.now().toString(36),
      ],
      { cwd: root, encoding: "utf8" },
    ),
  ) as Record<"a" | "b", { id: number; email: string; username: string }>;
}
test("real persisted post survives a lost response without duplicate rows", async ({ page }) => {
  const users = fixture();
  await login(page, users.a.email);
  const ids: number[] = [];
  const keys: string[] = [];
  await page.route("**/api/v1/posts", async route => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().postDataJSON().client_id);
    // Persist through the actual API before losing only the browser response.
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    ids.push((await response.json()).data.id);
    if (ids.length === 1) return route.abort("connectionreset");
    return route.fulfill({ response });
  });
  const story = `Retry after accepted response ${Date.now()}`;
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tulis cerita", { exact: true }).fill(story);
  await dialog.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Cerita belum tersimpan");
  await expect(dialog.getByLabel("Tulis cerita", { exact: true })).toHaveValue(story);
  await dialog.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  expect(keys[0]).toBe(keys[1]);
  const response = await page.request.get(`/api/v1/feed?user_id=${users.a.id}`);
  expect(response.status()).toBe(200);
  const rows = (await response.json()).data as { id: number; body: string }[];
  expect(rows.filter(row => row.body === story).map(row => row.id)).toEqual([ids[0]]);
});

test("real social posting, interactions, rollback, reply, quote, edit, report and deletion", async ({
  page,
}) => {
  test.setTimeout(180000);
  const users = fixture();
  await login(page, users.a.email);
  const story = `Cerita kampus browser ${Date.now()}`;
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tulis cerita", { exact: true }).fill(story);
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Cerita dibagikan.");
  const card = page.locator("article[data-post-id]").filter({ hasText: story });
  await expect(card).toBeVisible();
  const id = await card.getAttribute("data-post-id");
  const savedLike = page.waitForResponse(
    (r) =>
      r.url().includes("/interactions/like") &&
      r.request().method() === "PUT" &&
      r.status() === 200,
  );
  await card.getByRole("button", { name: "Sukai cerita", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Sukai cerita", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await savedLike;
  await page.reload();
  await expect(
    card.getByRole("button", { name: "Sukai cerita", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.route(`**/api/v1/posts/${id}/interactions/like`, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Simulated isolated network failure" }),
    }),
  );
  await card.getByRole("button", { name: "Sukai cerita", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Perubahan dikembalikan.",
  );
  await expect(
    card.getByRole("button", { name: "Sukai cerita", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.unroute(`**/api/v1/posts/${id}/interactions/like`);
  const savedBookmark = page.waitForResponse(
    (r) =>
      r.url().includes("/interactions/bookmark") &&
      r.request().method() === "PUT" &&
      r.status() === 200,
  );
  await card
    .getByRole("button", { name: "Simpan cerita", exact: true })
    .click();
  await expect(
    card.getByRole("button", { name: "Simpan cerita", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await savedBookmark;
  await page.goto("/bookmarks");
  await expect(page.getByText(story, { exact: true })).toBeVisible();
  await page.goto(`/thread/${id}`);
  await page
    .getByLabel("Tulis balasan", { exact: true })
    .fill("Sudut pandang dari browser.");
  await page.getByRole("button", { name: "Balas", exact: true }).click();
  await expect(
    page.locator("article").filter({ hasText: "Sudut pandang dari browser." }),
  ).toBeVisible();
  const original = page.locator(`article[data-post-id="${id}"]`);
  await original
    .getByRole("button", { name: "Bagikan ulang cerita", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Repost", exact: true }).click();
  await expect(
    original.getByRole("button", { name: "Bagikan ulang cerita", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await original
    .getByRole("button", { name: "Bagikan ulang cerita", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Kutip cerita", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tulis cerita", { exact: true })
    .fill("Kutipan dengan perspektif baru.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Bagikan", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await original.getByRole("button", { name: "Opsi cerita" }).click();
  await page
    .getByRole("menuitem", { name: "Edit cerita", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Tulis cerita", { exact: true })
    .fill(story + " diedit");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(
    original.getByText(story + " diedit", { exact: true }),
  ).toBeVisible();
  await original.getByRole("button", { name: "Opsi cerita" }).click();
  await page
    .getByRole("menuitem", { name: "Laporkan cerita", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kirim laporan" })
    .click();
  await expect(page.getByRole("status")).toContainText("Laporan diterima");
  await page.goto("/home");
  await page.getByRole("tab", { name: "Kampus", exact: true }).click();
  await expect(page.getByRole("region", { name: "Memuat cerita" })).toHaveCount(
    0,
  );
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/social-feed-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/social-feed-mobile.png"),
    fullPage: true,
  });
  await page.goto(`/thread/${id}`);
  await page
    .locator(`article[data-post-id="${id}"]`)
    .getByRole("button", { name: "Opsi cerita" })
    .click();
  await page
    .getByRole("menuitem", { name: "Hapus cerita", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hapus cerita", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Cerita dihapus.");
  await page.goto("/home");
  await expect(
    page.getByText(story + " diedit", { exact: true }),
  ).not.toBeVisible();
});
test("private follow approval, follow feed, mute and bilateral block are persisted", async ({
  browser,
}) => {
  test.setTimeout(150000);
  const users = fixture();
  const a = await browser.newContext();
  const b = await browser.newContext();
  const author = await a.newPage();
  const viewer = await b.newPage();
  await login(author, users.a.email);
  await author.goto("http://localhost:3000/profile/edit");
  await author.getByLabel("Akun privat", { exact: true }).check();
  await author.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(author.getByRole("status")).toContainText("Profil disimpan");
  await author.goto("http://localhost:3000/home");
  await author.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  await author.getByRole("dialog")
    .getByLabel("Tulis cerita", { exact: true })
    .fill("Cerita privat yang harus dilindungi.");
  await author.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(author.getByRole("status")).toContainText("Cerita dibagikan.");
  await login(viewer, users.b.email);
  await viewer.goto(`http://localhost:3000/u/${users.a.username}`);
  await expect(
    viewer.getByRole("heading", { name: "Akun ini privat", exact: true }),
  ).toBeVisible();
  await viewer.getByRole("button", { name: "Ikuti", exact: true }).click();
  await expect(
    viewer.getByRole("button", { name: "Diminta", exact: true }),
  ).toBeVisible();
  await author.goto("http://localhost:3000/requests");
  await author.getByRole("button", { name: "Setujui", exact: true }).click();
  await expect(author.getByRole("status")).toContainText(
    "Permintaan disetujui",
  );
  await viewer.reload();
  await expect(
    viewer.getByText("Cerita privat yang harus dilindungi.", { exact: true }),
  ).toBeVisible();
  await viewer.goto("http://localhost:3000/home");
  await viewer.getByRole("tab", { name: "Mengikuti", exact: true }).click();
  await expect(
    viewer.getByText("Cerita privat yang harus dilindungi.", { exact: true }),
  ).toBeVisible();
  await viewer.goto(`http://localhost:3000/u/${users.a.username}`);
  await viewer.getByRole("button", { name: "Opsi akun" }).click();
  await viewer
    .getByRole("menuitem", { name: "Senyapkan akun", exact: true })
    .click();
  await expect(viewer.getByRole("status")).toContainText(
    "Preferensi diperbarui",
  );
  await viewer.goto("http://localhost:3000/home");
  await viewer.getByRole("tab", { name: "Mengikuti", exact: true }).click();
  await expect(
    viewer.getByText("Cerita privat yang harus dilindungi.", { exact: true }),
  ).not.toBeVisible();
  await viewer.goto(`http://localhost:3000/u/${users.a.username}`);
  await viewer.getByRole("button", { name: "Opsi akun" }).click();
  await viewer
    .getByRole("menuitem", { name: "Blokir akun", exact: true })
    .click();
  await viewer
    .getByRole("dialog")
    .getByRole("button", { name: "Blokir akun", exact: true })
    .click();
  await expect(viewer).toHaveURL("http://localhost:3000/explore");
  await author.goto(`http://localhost:3000/u/${users.b.username}`);
  await expect(
    author.getByRole("alert").filter({ hasText: "Profil tidak ditemukan" }),
  ).toBeVisible();
  await a.close();
  await b.close();
});
