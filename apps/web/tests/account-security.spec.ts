import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");
const password = readFileSync(path.join(root, "apps/api/.env"), "utf8").match(/^DEMO_PASSWORD=(.+)$/m)?.[1].trim();
async function login(page: Page, email: string, secret: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test("password rotation preserves current web login and revokes another browser and native token", async ({ page, browser, playwright }) => {
  const fixture = JSON.parse(execFileSync("php", ["-d", "extension=pdo_pgsql", path.join(root, "infrastructure/scripts/e2e-social-fixture.php"), Date.now().toString(36)], { cwd: root, encoding: "utf8" }));
  const email = fixture.a.email;
  const baseURL = "http://localhost:3000";
  const other = await browser.newContext({ baseURL });
  const native = await playwright.request.newContext({ baseURL });
  try {
    await login(page, email, password!);
    await login(await other.newPage(), email, password!);
    const nativeLogin = await native.post("/api/v1/auth/native/login", { data: { email, password, device_name: "Account security CI" } });
    expect(nativeLogin.status()).toBe(200);
    const token = (await nativeLogin.json()).data.token;
    await page.goto("/settings/password");
    await page.getByLabel("Kata sandi saat ini", { exact: true }).fill("WrongPassword123");
    await page.getByLabel("Kata sandi baru", { exact: true }).fill("ReplacementPassword456");
    await page.getByLabel("Konfirmasi kata sandi baru", { exact: true }).fill("ReplacementPassword456");
    await page.getByRole("button", { name: "Simpan kata sandi" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Kata sandi saat ini tidak sesuai." })).toBeVisible();
    await page.getByLabel("Kata sandi saat ini", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Simpan kata sandi" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Kata sandi diperbarui" })).toBeVisible();
    expect((await page.request.get("/api/v1/me", { headers: { Origin: baseURL } })).status()).toBe(200);
    expect((await other.request.get("/api/v1/me", { headers: { Origin: baseURL } })).status()).toBe(401);
    expect((await native.get("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(axe.violations).toEqual([]);
    await page.screenshot({ path: path.join(root, "docs/testing/screenshots/account-password-updated.png"), fullPage: true });
    const status = await page.evaluate(async () => {
      const token = document.cookie.split("; ").find(c => c.startsWith("XSRF-TOKEN="))?.slice(11);
      return (await fetch("/api/v1/auth/logout", { method: "POST", headers: { Accept: "application/json", "X-XSRF-TOKEN": decodeURIComponent(token!) } })).status;
    });
    expect(status).toBe(204);
    await login(page, email, "ReplacementPassword456");
  } finally { await other.close(); await native.dispose(); }
});

test("unavailable registration and recovery explain availability and permitted domains", async ({ page }) => {
  await page.route("**/api/v1/auth/options", route => route.fulfill({ json: { data: { registration_enabled: false, email_delivery_enabled: false, email_domains: ["students.uin-suska.ac.id", "uin-suska.ac.id"] } } }));
  await page.goto("/register");
  await expect(page.getByRole("status")).toContainText("Pendaftaran belum dibuka");
  await expect(page.getByText(/Email kampus:/)).toContainText("@students.uin-suska.ac.id");
  await expect(page.getByRole("button", { name: "Buat akun" })).toBeDisabled();
  await page.goto("/forgot-password");
  await expect(page.getByRole("status")).toContainText("Pemulihan melalui email belum tersedia");
  await expect(page.getByRole("button", { name: "Kirim tautan pemulihan" })).toBeDisabled();
});

test("root opens a compact login without a marketing landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("heading", { name: "Selamat datang kembali." })).toBeVisible();
  await expect(page.getByText("Tentang Simeyo", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Sudut pandang berbeda.", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(root, "docs/testing/screenshots/login-direct-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(root, "docs/testing/screenshots/login-direct-mobile.png"), fullPage: true });
});

test("Firebase Google option explains the exact campus domains", async ({ page }) => {
  await page.route("**/api/v1/auth/options", route => route.fulfill({ json: { data: { registration_enabled: true, email_delivery_enabled: false, email_domains: ["students.uin-suska.ac.id", "uin-suska.ac.id"], firebase: { apiKey: "test-public-key", projectId: "simeyo-test", appId: "test-app", authDomain: "simeyo-test.firebaseapp.com" } } } }));
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Lanjutkan dengan Google kampus" })).toBeVisible();
  await expect(page.getByText(/Email kampus diverifikasi melalui Google/)).toBeVisible();
});

test("campus registration remains pending and cannot read the campus feed", async ({ page }) => {
  await page.route("**/api/v1/auth/options", route => route.fulfill({ json: { data: { registration_enabled: true, email_delivery_enabled: false, email_domains: ["students.uin-suska.ac.id", "uin-suska.ac.id"] } } }));
  const username = `pending_${Date.now().toString(36)}`;
  await page.goto("/register");
  await expect(page.getByRole("status")).toContainText("Akun baru tetap belum terverifikasi");
  await page.getByLabel("Nama lengkap", { exact: true }).fill("Pendaftar Pengujian");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Email", { exact: true }).fill(`${username}@students.uin-suska.ac.id`);
  await page.getByLabel("Kata sandi", { exact: true }).fill("PendingCampusPassword123");
  await page.getByLabel("Ulangi kata sandi", { exact: true }).fill("PendingCampusPassword123");
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(page).toHaveURL(/\/settings#account-campus$/);
  await expect(page.getByRole("button", { name: "Kirim ulang tautan" })).toBeDisabled();
  await expect(page.getByRole("status").filter({hasText: "Layanan verifikasi email belum tersedia"})).toBeVisible();
  expect((await page.request.get("/api/v1/feed", { headers: { Origin: "http://localhost:3000" } })).status()).toBe(403);
  await page.screenshot({ path: path.join(root, "docs/testing/screenshots/account-pending-verification.png"), fullPage: true });
});
