import { expect, test } from "@playwright/test";

test("theme, device, and width visual baselines", async ({ page }) => {
  await page.goto("/tests/visual/");

  for (const name of ["default", "compact", "fill", "dark", "mobile"]) {
    const renderer = page.locator(`#case-${name}`);
    await expect(renderer).toBeVisible();
    await expect(renderer).toHaveScreenshot(`card-renderer-${name}.png`);
  }
});
