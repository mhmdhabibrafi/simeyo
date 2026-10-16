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
test("real persisted messages, private Reverb delivery, notifications and mobile keyboard UI", async ({
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
  const second = await browser.newContext();
  const recipient = await second.newPage();
  const events: string[] = [];
  recipient.on("websocket", (socket) =>
    socket.on("framereceived", (frame) => {
      const data = String(frame.payload);
      if (data.includes("activity.changed")) events.push(data);
    }),
  );
  await login(recipient, users.b.email);
  await recipient.goto("http://localhost:3000/settings/communications");
  const save = recipient.waitForResponse(
    (r) =>
      r.url().includes("communication-preferences") &&
      r.request().method() === "PATCH" &&
      r.status() === 200,
  );
  await recipient
    .getByLabel("Siapa yang boleh mengirim pesan?")
    .selectOption("campus");
  await save;
  await login(page, users.a.email);
  await page.goto("http://localhost:3000/settings/communications");
  const senderPreference = page.waitForResponse(
    (r) =>
      r.url().includes("communication-preferences") &&
      r.request().method() === "PATCH" &&
      r.status() === 200,
  );
  await page
    .getByLabel("Siapa yang boleh mengirim pesan?")
    .selectOption("campus");
  await senderPreference;
  await page.goto(`http://localhost:3000/u/${users.b.username}`);
  await page.getByRole("button", { name: "Pesan", exact: true }).click();
  await expect(page).toHaveURL(/\/messages\/\d+/);
  const url = page.url();
  await recipient.goto(url);
  await expect(recipient.getByLabel("Tulis pesan")).toBeVisible();
  const body = `Pesan privat browser ${Date.now()}`;
  const sent = page.waitForResponse(
    (r) =>
      r.url().endsWith("/messages") &&
      r.request().method() === "POST" &&
      r.status() === 201,
  );
  await page.getByLabel("Tulis pesan").fill(body);
  await page.getByRole("button", { name: "Kirim pesan", exact: true }).click();
  await sent;
  await expect(page.getByRole("log", { name: "Riwayat pesan" }).getByText(body, { exact: true })).toBeVisible();
  await expect(recipient.getByRole("log", { name: "Riwayat pesan" }).getByText(body, { exact: true })).toBeVisible();
  await expect.poll(() => events.length, { timeout: 15000 }).toBeGreaterThan(0);
  expect(events.some((e) => e.includes(body))).toBe(false);
  await page.reload();
  await expect(page.getByRole("log", { name: "Riwayat pesan" }).getByText(body, { exact: true })).toBeVisible();
  await recipient.goto("http://localhost:3000/notifications");
  await expect(
    recipient.getByText("mengirim pesan", { exact: false }),
  ).toBeVisible();
  await expect.poll(async () => (await (await recipient.request.get("/api/v1/notifications")).json()).unread_count).toBe(0);
  await expect(page.getByLabel("Dibaca", { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(root, "docs/testing/screenshots/messages-mobile.png"),
    fullPage: true,
  });
  const issues = await new AxeBuilder({ page }).analyze();
  expect(issues.violations).toEqual([]);
  await second.close();
});
