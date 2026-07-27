import { expect, test } from "@playwright/test";
import { FEISHU_CHART_TYPES } from "../../src/adapters/chart";

async function settleVisualLayout(
  page: import("@playwright/test").Page,
  selector: string,
): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  const charts = page.locator(`${selector} .fcr-chart`);
  const count = await charts.count();
  for (let index = 0; index < count; index += 1) {
    await expect(charts.nth(index)).toHaveAttribute("data-state", "ready");
    await expect(charts.nth(index).locator("canvas,svg")).not.toHaveCount(0);
  }
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

test("theme, device, and width visual baselines", async ({ page }) => {
  await page.goto("/tests/visual/");

  for (const name of ["default", "compact", "fill", "dark", "mobile"]) {
    const renderer = page.locator(`#case-${name}`);
    await expect(renderer).toBeVisible();
    const chart = renderer.locator(".fcr-chart");
    if (await chart.count() > 0) {
      await expect(chart).toHaveAttribute("data-state", "ready");
    }
    await settleVisualLayout(page, `#case-${name}`);
    await expect(renderer).toHaveScreenshot(`card-renderer-${name}.png`);
  }
});

test("container visual baseline", async ({ page }) => {
  await page.goto("/tests/visual/");
  const renderer = page.locator("#case-containers");
  await expect(renderer).toBeVisible();
  await settleVisualLayout(page, "#case-containers");
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

test("Markdown native theme covers light/dark, PC/mobile, and every width", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  for (const colorScheme of ["light", "dark"]) {
    for (const device of ["pc", "mobile"]) {
      for (const width of ["compact", "default", "fill"]) {
        const name = `${colorScheme}-${device}-${width}`;
        const host = page.locator(`#case-markdown-theme-${name}`);
        const root = host.locator(".fcr-root");
        await expect(root).toBeVisible();
        const overflow = await host.evaluate((element) => {
          const card = element.querySelector<HTMLElement>(".fcr-root")!;
          const code = element.querySelector<HTMLElement>(
            ".fcr-markdown-code-block",
          )!;
          const table = element.querySelector<HTMLElement>(
            ".fcr-markdown-table-wrap",
          )!;
          return {
            host: element.clientWidth,
            card: card.clientWidth,
            cardScroll: card.scrollWidth,
            code: code.clientWidth,
            codeScroll: code.scrollWidth,
            codeOverflow: getComputedStyle(code).overflowX,
            table: table.clientWidth,
            tableScroll: table.scrollWidth,
            tableOverflow: getComputedStyle(table).overflowX,
          };
        });
        expect(overflow.card).toBeLessThanOrEqual(overflow.host);
        expect(overflow.cardScroll).toBe(overflow.card);
        expect(overflow.code).toBeLessThanOrEqual(overflow.card);
        expect(overflow.table).toBeLessThanOrEqual(overflow.card);
        expect(overflow.codeScroll).toBeGreaterThanOrEqual(overflow.code);
        expect(overflow.tableScroll).toBeGreaterThanOrEqual(overflow.table);
        expect(overflow.codeOverflow).toBe("auto");
        expect(overflow.tableOverflow).toBe("auto");
        await expect(host).toHaveScreenshot(`markdown-theme-${name}.png`);
      }
    }
  }
});

test("chart light, dark, and mobile visual baselines", async ({ page }) => {
  await page.goto("/tests/visual/");
  for (const name of ["chart-light", "chart-dark", "chart-mobile"]) {
    const renderer = page.locator(`#case-${name}`);
    await expect(renderer).toBeVisible();
    await expect(renderer.locator(".fcr-chart")).toHaveAttribute("data-state", "ready");
    await settleVisualLayout(page, `#case-${name}`);
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
        await settleVisualLayout(page, `#case-matrix-${name}`);
        expect(await renderer.locator(".fcr-root").evaluate(
          (node) => node.scrollWidth === node.clientWidth,
        )).toBe(true);
        await expect(renderer).toHaveScreenshot(`card-matrix-${name}.png`);
      }
    }
  }
});
