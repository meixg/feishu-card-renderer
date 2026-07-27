import { expect, test } from "@playwright/test";
import { FEISHU_CHART_TYPES } from "../../src/adapters/chart";

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

test("Markdown code scrolls locally without widening a compact mobile card", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const renderer = page.locator("#case-markdown-code-tasks .fcr-root");
  const code = renderer.locator(".fcr-markdown-code-block").first();
  await expect(code).toBeVisible();
  expect(await code.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await renderer.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await expect(page.locator("#case-markdown-code-tasks")).toHaveScreenshot(
    "markdown-code-tasks-mobile-compact.png",
  );
});

test("Markdown tables scroll locally without widening 400/600/fill cards", async ({
  page,
}) => {
  await page.goto("/tests/visual/");

  for (const width of ["compact", "default", "fill"]) {
    const host = page.locator(`#case-markdown-table-${width}`);
    const wrapper = host.locator(".fcr-markdown-table-wrap");
    await expect(wrapper.getByRole("table")).toBeVisible();

    const measurements = await host.evaluate((element) => {
      const root = element.querySelector<HTMLElement>(".fcr-root")!;
      const scroll = element.querySelector<HTMLElement>(
        ".fcr-markdown-table-wrap",
      )!;
      return {
        hostWidth: element.clientWidth,
        cardWidth: root.clientWidth,
        cardScrollWidth: root.scrollWidth,
        wrapperWidth: scroll.clientWidth,
        wrapperScrollWidth: scroll.scrollWidth,
      };
    });
    expect(measurements.cardWidth).toBeLessThanOrEqual(measurements.hostWidth);
    expect(measurements.cardScrollWidth).toBe(measurements.cardWidth);
    expect(measurements.wrapperWidth).toBeLessThanOrEqual(
      measurements.cardWidth,
    );
    if (width === "compact") {
      expect(measurements.wrapperScrollWidth).toBeGreaterThan(
        measurements.wrapperWidth,
      );
    }
  }
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

test("every declared Feishu chart type reaches ready in the real browser runtime", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.goto("/tests/visual/");
  const cases = page.locator("#case-chart-compatibility [data-chart-type]");
  await expect(cases).toHaveCount(FEISHU_CHART_TYPES.length);
  for (const type of FEISHU_CHART_TYPES) {
    const chart = page.locator(`[data-chart-type="${type}"] .fcr-chart`);
    await expect(chart, type).toHaveAttribute("data-state", "ready", {
      timeout: 15_000,
    });
    await expect(chart.locator("canvas,svg"), type).not.toHaveCount(0);
  }
  expect(runtimeErrors).toEqual([]);
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
