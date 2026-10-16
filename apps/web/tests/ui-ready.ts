import type { Page } from "@playwright/test";

export async function waitForAnimations(page: Page) {
  await page.evaluate(async () => {
    const finite = document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
  });
}
