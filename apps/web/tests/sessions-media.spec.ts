import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
const env = readFileSync(path.resolve(__dirname, "../../api/.env"), "utf8");
const password = env.match(/^DEMO_PASSWORD=(.+)$/m)?.[1].trim();
async function login(page: Page) {
  await page.goto("http://localhost:3000/login");
  await page.getByLabel("Email", { exact: true }).fill("rafi@example.test");
  await page.getByLabel("Kata sandi", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/home");
}
test("one browser revokes another session and profile image stays authenticated", async ({
  browser,
}) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const first = await a.newPage();
  const second = await b.newPage();
  await login(first);
  await login(second);
  await first.goto("http://localhost:3000/settings");
  await first.locator("summary").filter({ hasText: "Sesi aktif" }).click();
  await first
    .getByRole("button", { name: "Akhiri sesi", exact: true })
    .first()
    .click();
  await first
    .getByRole("dialog")
    .getByRole("button", { name: "Akhiri sesi", exact: true })
    .click();
  await expect(first.getByRole("dialog")).not.toBeVisible();
  await second.goto("http://localhost:3000/home");
  await expect(second).toHaveURL("http://localhost:3000/login");
  await first.goto("http://localhost:3000/profile/edit");
  const png = await first.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#6D4AFF";
    c.fillRect(0, 0, 32, 32);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await first.getByLabel("Foto profil", { exact: true }).setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(first.getByRole("status")).toContainText("Foto diperbarui.");
  const image = first.locator("img").last();
  await expect(image).toHaveAttribute("src", /\/media\/profiles\//);
  await expect
    .poll(() =>
      image.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const src = await image.getAttribute("src");
  const anonymous = await browser.newContext();
  const response = await anonymous.request.get(`http://localhost:3000${src}`, {
    headers: { Accept: "application/json" },
  });
  expect(response.status()).toBe(401);
  await anonymous.close();
  await first.getByLabel("Foto profil", { exact: true }).setInputFiles({
    name: "malicious.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
  });
  await expect(
    first
      .getByRole("alert")
      .filter({ hasText: /image|file|type|format|gambar/i }),
  ).toBeVisible();
  await a.close();
  await b.close();
});
