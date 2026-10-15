import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("public pages meet axe WCAG 2.1 AA checks in light and dark themes", async ({
  page,
}) => {
  for (const route of ["/", "/login", "/register", "/forgot-password"]) {
    await page.goto(route);
    await page.getByRole("main").waitFor();
    const light = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(light.violations).toEqual([]);
    const toggle = page.getByRole("button", { name: "Gunakan tema gelap" });
    if (await toggle.count()) {
      await toggle.click();
      const dark = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(dark.violations).toEqual([]);
      await page.getByRole("button", { name: "Gunakan tema terang" }).click();
    }
  }
});
