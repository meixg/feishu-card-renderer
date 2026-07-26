import { expect, test } from "@playwright/test";

test("placeholder visual baseline", async ({ page }) => {
  await page.goto("/tests/visual/");

  const renderer = page.locator('[data-fcr-card-renderer="placeholder"]');
  await expect(renderer).toBeVisible();
  await expect(renderer).toHaveScreenshot("card-renderer-placeholder.png");
});
