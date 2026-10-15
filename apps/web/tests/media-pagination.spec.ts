import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(__dirname, "../../..");
const password = readFileSync(path.join(root, "apps/api/.env"), "utf8")
  .match(/^DEMO_PASSWORD=(.+)$/m)?.[1]
  .trim();
test("infinite cursor scrolling and image-only thread/media viewer use real API storage", async ({
  page,
}) => {
  test.setTimeout(120000);
  const result = JSON.parse(
    execFileSync(
      "php",
      [
        "-d",
        "extension=pdo_pgsql",
        path.join(root, "infrastructure/scripts/e2e-social-fixture.php"),
        Date.now().toString(36),
        "timeline",
      ],
      { cwd: root, encoding: "utf8" },
    ),
  ) as { a: { email: string; post_ids: number[] } };
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(result.a.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL("/home");
  await page.getByRole("tab", { name: "Kampus", exact: true }).click();
  await expect(
    page.locator(`article[data-post-id="${result.a.post_ids[17]}"]`),
  ).toBeVisible();
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(
    page.locator(`article[data-post-id="${result.a.post_ids[0]}"]`),
  ).toBeVisible();
  const ids = await page
    .locator("article[data-post-id]")
    .evaluateAll((cards) => cards.map((c) => c.getAttribute("data-post-id")));
  expect(new Set(ids).size).toBe(ids.length);
  await page.goto("/compose");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#6D4AFF";
    ctx.fillRect(0, 0, 64, 32);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Lampirkan gambar", { exact: true }).setInputFiles({
    name: "campus.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(page.getByAltText("Pratinjau lampiran")).toBeVisible();
  const created = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/posts") &&
      r.request().method() === "POST" &&
      r.status() === 201,
  );
  await page.getByRole("button", { name: "Bagikan", exact: true }).click();
  const response = await created;
  const data = await response.json();
  await page.goto(`/thread/${data.data.id}`);
  await page
    .getByRole("button", { name: "Lihat gambar cerita", exact: true })
    .click();
  const image = page
    .getByRole("dialog")
    .getByAltText("Gambar cerita diperbesar");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 64,
      ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
