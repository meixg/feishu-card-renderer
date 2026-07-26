import { expect, test } from "@playwright/test";

test("theme, device, and width visual baselines", async ({ page }) => {
  await page.goto("/tests/visual/");

  for (const name of ["default", "compact", "fill", "dark", "mobile"]) {
    const renderer = page.locator(`#case-${name}`);
    await expect(renderer).toBeVisible();
    await expect(renderer).toHaveScreenshot(`card-renderer-${name}.png`);
  }
});

test("container visual baseline", async ({ page }) => {
  await page.goto("/tests/visual/");
  const renderer = page.locator("#case-containers");
  await expect(renderer).toBeVisible();
  await expect(renderer).toHaveScreenshot("card-renderer-containers.png");
});

test("chart light, dark, and mobile visual baselines", async ({ page }) => {
  await page.goto("/tests/visual/");
  for (const name of ["chart-light", "chart-dark", "chart-mobile"]) {
    const renderer = page.locator(`#case-${name}`);
    await expect(renderer).toBeVisible();
    await expect(renderer.locator(".fcr-chart")).toHaveAttribute("data-state", "ready");
    await expect(renderer).toHaveScreenshot(`card-renderer-${name}.png`);
  }
});
