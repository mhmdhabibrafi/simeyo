import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
const root = path.resolve(__dirname, "../../..");
test.use({ actionTimeout: 15000 });
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
test("private community requests, member feed, mentions, pulse, search and event RSVP persist", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  const users = JSON.parse(
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
  );
  await login(page, users.a.email);
  await page.goto("http://localhost:3000/communities");
  await page
    .getByRole("button", { name: "Komunitas baru", exact: true })
    .click();
  const name = `Lingkaran browser ${Date.now()}`;
  await page.getByLabel("Nama komunitas", { exact: true }).fill(name);
  await page
    .getByLabel("Tentang komunitas")
    .fill("Komunitas fiktif untuk pengujian kolaborasi kampus.");
  await page.getByLabel("Visibilitas komunitas").selectOption("private");
  await page
    .getByRole("button", { name: "Buat komunitas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/communities\/\d+/);
  const communityURL = page.url();
  const second = await browser.newContext();
  const viewer = await second.newPage();
  await login(viewer, users.b.email);
  await viewer.goto(communityURL);
  await expect(
    viewer.getByText("Cerita hanya tersedia untuk anggota yang disetujui."),
  ).toBeVisible();
  await viewer.getByRole("button", { name: "Bergabung", exact: true }).click();
  await expect(
    viewer.getByRole("button", { name: "Batalkan permintaan" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kelola komunitas", exact: true })
    .click();
  await page.getByRole("button", { name: "Terima", exact: true }).click();
  await viewer.reload();
  await expect(
    viewer.getByLabel("Tulis cerita", { exact: true }),
  ).toBeVisible();
  const privateStory = `Cerita privat #Kolaborasi @${users.b.username}`;
  await page
    .getByRole("button", { name: "Simpan komunitas", exact: true })
    .click();
  await page.getByLabel("Tulis cerita", { exact: true }).fill(privateStory);
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  await expect(page.getByText(privateStory, { exact: true })).toBeVisible();
  const loadedMemberFeed = viewer.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/feed?") &&
      r.url().includes("community_id=") &&
      r.status() === 200,
    { timeout: 45000 },
  );
  await viewer.reload();
  await loadedMemberFeed;
  await expect(viewer.getByText(privateStory, { exact: true })).toBeVisible();
  await viewer.goto("http://localhost:3000/explore");
  await viewer.getByLabel("Cari cerita atau hashtag").fill("#Kolaborasi");
  await viewer.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(viewer.getByText(privateStory, { exact: true })).toBeVisible();
  await page.goto("http://localhost:3000/events");
  await page.getByRole("button", { name: "Acara baru", exact: true }).click();
  const title = `Diskusi browser ${Date.now()}`;
  await page.getByLabel("Judul acara").fill(title);
  await page
    .getByLabel("Deskripsi acara")
    .fill("Diskusi fiktif untuk pengujian acara kampus.");
  await page.getByLabel("Lokasi", { exact: true }).fill("Perpustakaan kampus");
  await page.getByLabel("Mulai", { exact: true }).fill("2026-12-01T09:00");
  await page.getByLabel("Selesai", { exact: true }).fill("2026-12-01T11:00");
  await page.getByRole("button", { name: "Simpan acara", exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await viewer.goto("http://localhost:3000/events");
  const card = viewer.locator("article").filter({ hasText: title });
  await card.getByRole("button", { name: "Saya hadir", exact: true }).click();
  await expect(card.getByText(/1 akan hadir/)).toBeVisible();
  await viewer.reload();
  await expect(
    card.getByRole("button", { name: "Batalkan hadir", exact: true }),
  ).toBeVisible();
  await viewer.setViewportSize({ width: 390, height: 844 });
  await viewer.screenshot({
    path: path.join(root, "docs/testing/screenshots/campus-events-mobile.png"),
    fullPage: true,
  });
  expect((await new AxeBuilder({ page: viewer }).analyze()).violations).toEqual(
    [],
  );
  await page.goto(communityURL);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(page.getByText(privateStory, { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Memuat cerita" })).toHaveCount(
    0,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/community-desktop.png"),
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await second.close();
});
