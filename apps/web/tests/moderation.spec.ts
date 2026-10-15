import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
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
test("administrator reviews a real report and removal hides the source story", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);

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
  const story = `Konten moderasi browser ${Date.now()}`;
  await page.getByRole("button", { name: "Tulis cerita", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Tulis cerita", { exact: true }).fill(story);
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  const post = page.locator("article[data-post-id]").filter({ hasText: story });
  await expect(post).toBeVisible();
  const id = await post.getAttribute("data-post-id");
  const second = await browser.newContext();
  const reporter = await second.newPage();
  await login(reporter, users.b.email);
  await reporter.goto(`http://localhost:3000/thread/${id}`);
  await reporter
    .getByRole("button", { name: "Opsi cerita", exact: true })
    .first()
    .click();
  await reporter.getByRole("menuitem", { name: "Laporkan" }).click();
  await reporter
    .getByRole("button", { name: "Kirim laporan", exact: true })
    .click();
  await expect(reporter.getByRole("status")).toContainText("Laporan");
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await login(admin, "admin@example.test");
  await admin.goto("http://localhost:3000/admin/moderation");
  const report = admin.locator("article").filter({ hasText: story });
  await expect(report).toBeVisible();
  await report
    .getByRole("button", { name: "Tinjau laporan", exact: true })
    .click();
  await admin.getByLabel("Keputusan").selectOption("remove");
  await admin
    .getByLabel("Alasan tinjauan")
    .fill("Konten fiktif dihapus untuk pengujian moderasi.");
  const saved = admin.waitForResponse(
    (r) =>
      r.url().includes("/admin/moderation/") &&
      r.request().method() === "PATCH" &&
      r.status() === 204,
  );
  await admin
    .getByRole("button", { name: "Simpan keputusan", exact: true })
    .click();
  await saved;
  await expect(report).toHaveCount(0);
  await reporter.reload();
  await expect(
    reporter.getByText("Cerita tidak ditemukan atau tidak dapat kamu akses."),
  ).toBeVisible();
  await second.close();
  await adminContext.close();
});
