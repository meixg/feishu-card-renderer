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

async function overlayActions(
  page: import("@playwright/test").Page,
): Promise<unknown[]> {
  return page.locator("#overlay-actions").evaluate((node) =>
    JSON.parse(node.textContent || "[]"));
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

test("Alert Dialog traps focus, cancels safely, and confirms exactly once", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const overlay = page.locator("#case-overlays");
  const trigger = overlay.getByRole("button", { name: "打开确认" });

  await trigger.focus();
  await trigger.press("Enter");
  let dialog = overlay.getByRole("alertdialog", { name: "确认执行" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "取消" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "确认" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "取消" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await overlayActions(page)).toEqual([]);

  await trigger.press("Space");
  dialog = overlay.getByRole("alertdialog", { name: "确认执行" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "确认" }).press("Enter");

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  const actions = await overlayActions(page) as Array<{
    type?: string;
    value?: { owner?: string };
  }>;
  expect(actions).toHaveLength(1);
  expect(actions[0]).toMatchObject({
    type: "callback",
    value: { owner: "confirm-child" },
  });
});

test("Dropdown Menu supports roving keys, outside press, and confirm handoff", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const overlay = page.locator("#case-overlays");
  const trigger = overlay.getByRole("button", { name: "更多操作" });

  await trigger.focus();
  await trigger.press("Enter");
  let menu = overlay.getByRole("menu", { name: "更多操作" });
  let first = overlay.getByRole("menuitem", { name: "第一项" });
  const disabled = overlay.getByRole("menuitem", { name: "禁用项" });
  let last = overlay.getByRole("menuitem", { name: "最后项" });
  await expect(first).toBeFocused();
  await first.press("End");
  await expect(last).toBeFocused();
  await last.press("Home");
  await expect(first).toBeFocused();
  await first.press("ArrowDown");
  await expect(disabled).toBeFocused();
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await disabled.press("Enter");
  await expect(menu).toBeVisible();
  expect(await overlayActions(page)).toEqual([]);
  await disabled.press("ArrowDown");
  await expect(last).toBeFocused();
  await last.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.press("Space");
  menu = overlay.getByRole("menu", { name: "更多操作" });
  await expect(menu).toBeVisible();
  await page.mouse.click(1, 1);
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  first = overlay.getByRole("menuitem", { name: "第一项" });
  await first.click();
  await expect(overlay.getByRole("menu")).toBeHidden();
  let dialog = overlay.getByRole("alertdialog", { name: "确认菜单操作" });
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await overlayActions(page)).toEqual([]);

  await trigger.click();
  last = overlay.getByRole("menuitem", { name: "最后项" });
  await last.click();
  dialog = overlay.getByRole("alertdialog", { name: "确认菜单操作" });
  await dialog.getByRole("button", { name: "确认" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  const actions = await overlayActions(page) as Array<{
    type?: string;
    value?: { owner?: string };
  }>;
  expect(actions).toHaveLength(1);
  expect(actions[0]).toMatchObject({
    type: "callback",
    value: { owner: "overflow-last" },
  });
  expect(actions).not.toContainEqual(expect.objectContaining({
    value: { owner: "container-parent" },
  }));
});

test("image Dialog handles arrows, trapped Tab, Escape, and outside press", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const overlay = page.locator("#case-overlays");
  const trigger = overlay.getByRole("button", { name: "打开图片组预览" });

  await trigger.focus();
  await trigger.press("Space");
  let dialog = overlay.getByRole("dialog", { name: "第一张" });
  await expect(dialog).toBeVisible();
  await dialog.press("ArrowRight");
  dialog = overlay.getByRole("dialog", { name: "第二张" });
  await expect(dialog).toContainText("2 / 2");
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  dialog = overlay.getByRole("dialog", { name: "第一张" });
  await expect(dialog).toBeVisible();
  await overlay.locator(".fcr-preview-backdrop").click({
    position: { x: 4, y: 4 },
  });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await overlayActions(page)).toEqual([]);
});
