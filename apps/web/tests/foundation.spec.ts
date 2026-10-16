import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(__dirname, "../../..");
const env = readFileSync(path.join(root, "apps/api/.env"), "utf8");
const password = env.match(/^DEMO_PASSWORD=(.+)$/m)?.[1].trim();
if (!password)
  throw new Error(
    "Run local-postgres and DevelopmentSeeder before browser tests.",
  );
mkdirSync(path.join(root, "docs/testing/screenshots"), { recursive: true });
test("root opens login directly, is responsive, keyboard accessible, and supports dark theme", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("heading", { name: "Selamat datang kembali." }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Lewati ke konten" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/login-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Gunakan tema gelap" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/login-dark.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Gunakan tema terang" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/login-mobile.png"),
    fullPage: true,
  });
});
test("cookie login, CSRF rejection, profile persistence and logout", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("nadia@example.test");
  await page.getByLabel("Kata sandi", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL("/home");
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL("/home");
  const status = await page.evaluate(async () => {
    const r = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ bio: "csrf bypass" }),
    });
    return r.status;
  });
  expect(status).toBe(419);
  await page.goto("/profile/edit");
  const bio = `Cerita dari browser ${Date.now()}`;
  await page.getByLabel("Bio", { exact: true }).fill(bio);
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.getByRole("status")).toContainText("Profil disimpan");
  await page.reload();
  await expect(page.getByLabel("Bio", { exact: true })).toHaveValue(bio);
  await page.goto("/profile");
  await expect(page.getByText(bio, { exact: true })).toBeVisible();
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/profile-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("navigation", { name: "Navigasi seluler" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/profile-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Menu akun" }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: "Keluar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keluar", exact: true })
    .click();
  await expect(page).toHaveURL("/login");
  const me = await page.request.get("/api/v1/me");
  expect(me.status()).toBe(401);
});
test("registration, signed email verification, onboarding and administrator review", async ({
  page,
  browser,
}) => {
  const username = `e2e_${Date.now().toString(36)}`;
  const email = `${username}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Nama lengkap").fill("Mahasiswa Pengujian");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill("BrowserSecure123");
  await page.getByLabel("Ulangi kata sandi").fill("BrowserSecure123");
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(page).toHaveURL("/settings#account-campus");
  const campus = await page.request.get("/api/v1/campus", {
    headers: { Origin: "http://localhost:3000", Accept: "application/json" },
  });
  expect(campus.status()).toBe(403);
  const signed = execFileSync(
    "php",
    [
      "-d",
      "extension=pdo_pgsql",
      path.join(root, "infrastructure/scripts/e2e-fixture.php"),
      username,
    ],
    { cwd: root, encoding: "utf8" },
  ).trim();
  await page.goto(signed);
  await expect(page).toHaveURL("http://localhost:3000/onboarding");
  await page
    .getByLabel("Kampus", { exact: true })
    .selectOption({ label: "UIN Sultan Syarif Kasim Riau" });
  await page
    .getByLabel("Fakultas (opsional)")
    .selectOption({ label: "Sains dan Teknologi" });
  await page
    .getByLabel("Program studi (opsional)")
    .selectOption({ label: "Teknik Informatika" });
  await page.getByRole("button", { name: "Simpan dan lanjutkan" }).click();
  await expect(page).toHaveURL("/settings#account-campus");
  await page
    .getByLabel("Jelaskan afiliasimu")
    .fill(
      "Saya mahasiswa pengujian fiktif di kampus ini untuk pengujian integrasi.",
    );
  await page.getByRole("button", { name: "Kirim pengajuan" }).click();
  await expect(
    page.getByText("Pengajuan sedang ditinjau. Periksa kembali nanti."),
  ).toBeVisible();
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto("http://localhost:3000/login");
  await admin.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await admin.getByLabel("Kata sandi", { exact: true }).fill(password!);
  await admin.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(admin).toHaveURL("http://localhost:3000/home");
  await admin.goto("http://localhost:3000/admin/verifications");
  const card = admin.locator("article").filter({ hasText: username });
  await card.getByRole("button", { name: "Setujui", exact: true }).click();
  await admin
    .getByLabel("Catatan untuk pemilik akun")
    .fill("Akun fiktif ditinjau melalui pengujian browser.");
  await admin.getByRole("button", { name: "Simpan keputusan" }).click();
  await expect(card).toContainText("approved");
  await adminContext.close();
  await page.reload();
  await expect(
    page.getByText("Kampus terverifikasi", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL("/settings#account-campus");
  await expect(page.getByRole("button", { name: "Periksa status", exact: true })).toHaveCount(0);
  expect(
    (
      await page.request.get("/api/v1/campus", {
        headers: {
          Origin: "http://localhost:3000",
          Accept: "application/json",
        },
      })
    ).status(),
  ).toBe(200);
});
test("form validation and API errors are visible without exposing secrets", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(page.getByText("Isi nama Anda")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("missing@example.test");
  await page.getByLabel("Kata sandi", { exact: true }).fill("WrongPassword123");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#email-error")).toBeVisible();
});
