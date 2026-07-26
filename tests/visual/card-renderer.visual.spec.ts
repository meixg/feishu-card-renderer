import { expect, test } from "@playwright/test";

test("theme, device, and width visual baselines", async ({ page }) => {
  await page.goto("/tests/visual/");

  for (const name of ["default", "compact", "fill", "dark", "mobile"]) {
    const renderer = page.locator(`#case-${name}`);
    await expect(renderer).toBeVisible();
    const chart = renderer.locator(".fcr-chart");
    if (await chart.count() > 0) {
      await expect(chart).toHaveAttribute("data-state", "ready");
    }
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

test("chart preview dialog visual baseline", async ({ page }) => {
  await page.goto("/tests/visual/");
  const renderer = page.locator("#case-chart-light");
  await expect(renderer.locator(".fcr-chart")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await renderer.getByRole("button", { name: "打开图表预览" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".fcr-chart")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(dialog).toHaveScreenshot("card-renderer-chart-preview.png");
});

test("covers the complete light/dark, PC/mobile, 400/600/fill release matrix", async ({ page }) => {
  await page.goto("/tests/visual/");

  for (const colorScheme of ["light", "dark"]) {
    for (const device of ["pc", "mobile"]) {
      for (const width of ["compact", "default", "fill"]) {
        const name = `${colorScheme}-${device}-${width}`;
        const renderer = page.locator(`#case-matrix-${name}`);
        await expect(renderer).toBeVisible();
        await expect(renderer.locator(".fcr-root")).toHaveClass(
          new RegExp(`fcr-width-${width}`),
        );
        await expect(renderer.locator(".fcr-root")).toHaveClass(
          new RegExp(`fcr-device-${device}`),
        );
        await expect(renderer).toHaveScreenshot(`card-matrix-${name}.png`);
      }
    }
  }
});
