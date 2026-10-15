import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve(__dirname, "../../..");
const password = readFileSync(path.join(root, "apps/api/.env"), "utf8")
  .match(/^DEMO_PASSWORD=(.+)$/m)?.[1]
  .trim();
test("authenticated screens, menus and privacy popover are accessible", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("nadia@example.test");
  await page.getByLabel("Kata sandi", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL("/home");
  for (const route of [
    "/home",
    "/profile",
    "/profile/edit",
    "/verification",
    "/settings",
  ]) {
    await page.goto(route);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({
      path: path.join(
        root,
        `docs/testing/screenshots/${route.slice(1).replaceAll("/", "-")}-verified.png`,
      ),
      fullPage: true,
    });
    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
    }
  }
  await page.getByRole("button", { name: "Tentang privasi akademik" }).click();
  await expect(
    page.getByText(
      "Informasi fakultas, program studi, dan angkatan hanya dibagikan jika kamu mengaktifkan visibilitas akademik pada profil.",
    ),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Menu akun" })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).not.toBeVisible();
  await page.getByRole("button", { name: "Menu akun" }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: "Keluar", exact: true }).click();
  const dialog = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dialog.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
