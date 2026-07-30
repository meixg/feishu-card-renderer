import { expect, test, type Locator } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { FEISHU_CHART_TYPES } from "../../src/adapters/chart";

async function captureHashEvidence(locator: Locator, name: string) {
  const directory = process.env.FCR_VISUAL_HASH_EVIDENCE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await locator.screenshot({
    animations: "disabled",
    path: resolve(directory, name),
  });
}

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

async function withTouchEmulation(
  session: import("@playwright/test").CDPSession,
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await operation();
  } finally {
    try {
      await session.send("Emulation.setTouchEmulationEnabled", {
        enabled: false,
      });
    } finally {
      await session.detach();
    }
  }
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
  for (const name of ["containers", "containers-dark", "containers-narrow"]) {
    const renderer = page.locator(`#case-${name}`);
    await expect(renderer).toBeVisible();
    await settleVisualLayout(page, `#case-${name}`);
    await expect(renderer).toHaveScreenshot(`card-renderer-${name}.png`);
  }
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
  test.setTimeout(90_000);
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

test("Button tokens, sizes, and portaled confirm inherit each card theme", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const baseline = page.locator("#case-button-baseline");
  const themes = ["light", "dark", "host"] as const;
  const primaryBackgrounds = new Map<string, string>();

  for (const theme of themes) {
    const owner = baseline.locator(`[data-button-theme="${theme}"]`);
    const primary = owner.getByRole("button", {
      name: theme === "light" ? "浅色" : theme === "dark" ? "深色" : "宿主",
      exact: true,
    });
    const measurements = await owner.evaluate((element) => {
      const buttons = [...element.querySelectorAll<HTMLButtonElement>(
        "[data-slot=button]",
      )];
      const rootElement = element.querySelector<HTMLElement>(".fcr-root")!;
      return {
        heights: buttons.map((button) => button.getBoundingClientRect().height),
        widths: buttons.map((button) => button.getBoundingClientRect().width),
        primary: getComputedStyle(buttons[0]).backgroundColor,
        danger: getComputedStyle(buttons[1]).color,
        laser: getComputedStyle(buttons[2]).backgroundColor,
        outlineBorder: getComputedStyle(buttons[3]).borderTopColor,
        rootPrimary: getComputedStyle(rootElement)
          .getPropertyValue("--fcr-interaction-primary").trim(),
        focus: getComputedStyle(rootElement)
          .getPropertyValue("--fcr-interaction-focus").trim(),
      };
    });
    expect(measurements.heights).toEqual([32, 28, 36, 32]);
    expect(measurements.widths[3]).toBeGreaterThan(measurements.widths[0]);
    expect(measurements.primary).not.toBe("rgba(0, 0, 0, 0)");
    expect(measurements.danger).not.toBe("");
    expect(measurements.laser).not.toBe(measurements.primary);
    expect(measurements.outlineBorder).not.toBe("rgba(0, 0, 0, 0)");
    expect(measurements.focus).toBe(theme === "light"
      ? "oklch(0.708 0 0)"
      : theme === "dark"
        ? "oklch(0.556 0 0)"
        : "oklch(0.65 0.03 250)");
    primaryBackgrounds.set(theme, measurements.primary);

    await primary.focus();
    await expect(primary).toBeFocused();
    expect(await primary.evaluate((button) =>
      getComputedStyle(button).boxShadow)).not.toBe("none");
    await primary.press("Enter");
    const dialog = owner.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    const inherited = await dialog.evaluate((node) => {
      const style = getComputedStyle(node);
      const root = node.closest<HTMLElement>(".fcr-root")!;
      return {
        portalPrimary: style.getPropertyValue("--fcr-interaction-primary").trim(),
        rootPrimary: getComputedStyle(root)
          .getPropertyValue("--fcr-interaction-primary").trim(),
        portalFocus: style.getPropertyValue("--fcr-interaction-focus").trim(),
        rootFocus: getComputedStyle(root)
          .getPropertyValue("--fcr-interaction-focus").trim(),
        surface: style.backgroundColor,
      };
    });
    expect(inherited.portalPrimary).toBe(inherited.rootPrimary);
    expect(inherited.portalFocus).toBe(inherited.rootFocus);
    expect(inherited.surface).not.toBe("rgba(0, 0, 0, 0)");
    await dialog.getByRole("button", { name: "取消" }).click();
    await expect(dialog).toHaveCount(0);
  }

  expect(primaryBackgrounds.get("light")).not.toBe(
    primaryBackgrounds.get("dark"),
  );
  expect(primaryBackgrounds.get("host")).not.toBe(
    primaryBackgrounds.get("light"),
  );
  await expect(baseline).toHaveScreenshot("button-base-nova-themes.png");
  await captureHashEvidence(baseline, "button-base-nova-themes.png");
});

test("an open card portal tears down without disturbing another card", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/tests/visual/");
  const lifecycle = page.locator("#case-portal-lifecycle");
  const firstCard = lifecycle.locator("[data-portal-card='first']");
  const secondCard = lifecycle.locator("[data-portal-card='second']");

  await firstCard.getByRole("button", { name: "打开第一张卡确认" }).click();
  const firstDialog = firstCard.getByRole("alertdialog", {
    name: "第一张卡确认",
  });
  await expect(firstDialog).toBeVisible();
  expect(await firstDialog.evaluate((node) =>
    node.closest("[data-portal-card]")?.getAttribute("data-portal-card")))
    .toBe("first");

  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>("#remove-first-card")?.click();
  });
  await expect(firstCard).toHaveCount(0);
  await expect(firstDialog).toHaveCount(0);
  await expect(lifecycle.locator("[data-fcr-portal-host]")).toHaveCount(1);

  const secondTrigger = secondCard.getByRole("button", {
    name: "打开第二张卡确认",
  });
  await expect(secondTrigger).toBeVisible();
  expect(await secondTrigger.evaluate((node) =>
    node.closest("[data-base-ui-inert]"))).toBeNull();
  await secondTrigger.focus();
  await secondTrigger.press("Enter");
  const secondDialog = secondCard.getByRole("alertdialog", {
    name: "第二张卡确认",
  });
  await expect(secondDialog).toBeVisible();
  await expect(secondDialog.getByRole("button", { name: "取消" }))
    .toBeFocused();
  expect(await secondDialog.evaluate((node) =>
    node.closest("[data-portal-card]")?.getAttribute("data-portal-card")))
    .toBe("second");

  await secondDialog.getByRole("button", { name: "确认" }).press("Enter");
  await expect(secondDialog).toBeHidden();
  await expect(secondTrigger).toBeFocused();
  const actions = await lifecycle.locator("[data-portal-actions]").evaluate(
    (node) => JSON.parse(node.textContent || "[]"),
  ) as Array<{ value?: { owner?: string } }>;
  expect(actions).toHaveLength(1);
  expect(actions[0]?.value).toEqual({ owner: "second" });
  expect(pageErrors).toEqual([]);
});

test("simultaneous card modal mounts hand off safely and clean up independently", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/tests/visual/");
  const lifecycle = page.locator("#case-portal-lifecycle");
  const firstCard = lifecycle.locator("[data-portal-card='first']");
  const secondCard = lifecycle.locator("[data-portal-card='second']");
  const firstTrigger = firstCard.getByRole("button", {
    name: "打开第一张卡确认",
  });

  await firstTrigger.click();
  const mountedOwners = await page.evaluate(async () => {
    document.querySelector<HTMLButtonElement>(
      "[data-portal-card='second'] button",
    )?.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return Array.from(document.querySelectorAll("[role='alertdialog']"))
      .map((node) => node.closest("[data-portal-card]")
        ?.getAttribute("data-portal-card"));
  });
  expect(mountedOwners).toEqual(["first", "second"]);

  const firstDialog = firstCard.locator("[role='alertdialog']");
  const secondDialog = secondCard.locator("[role='alertdialog']");
  await expect(secondDialog).toHaveCount(1);
  expect(await secondDialog.evaluate((node) =>
    node.closest("[data-fcr-portal-host]")?.closest("[data-portal-card]")
      ?.getAttribute("data-portal-card"))).toBe("second");
  expect(await secondDialog.evaluate((node) =>
    node.closest("[inert], [aria-hidden='true']") === null)).toBe(true);
  await expect(firstDialog).toHaveCount(0);
  await expect(secondDialog.getByRole("button", { name: "取消" })).toBeFocused();

  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>("#remove-second-card")?.click();
  });
  await expect(secondCard).toHaveCount(0);
  await expect(firstCard.locator("[data-fcr-portal-host]")).toHaveCount(1);
  await expect(page.locator("[data-base-ui-inert]")).toHaveCount(0);

  await firstTrigger.focus();
  await firstTrigger.press("Enter");
  const reopened = firstCard.getByRole("alertdialog", {
    name: "第一张卡确认",
  });
  await expect(reopened.getByRole("button", { name: "取消" })).toBeFocused();
  await reopened.getByRole("button", { name: "取消" }).press("Enter");
  await expect(reopened).toBeHidden();
  await expect(firstTrigger).toBeFocused();
  await expect(page.locator("[data-base-ui-inert]")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
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

test("scoped Dropdown Menu and Alert Dialog match the pinned light/dark snapshot", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  for (const theme of ["light", "dark"] as const) {
    const card = page.locator(`#case-matrix-${theme}-pc-compact`);
    const overflow = card.getByRole("button", { name: "更多操作" });
    await overflow.click();
    const menu = card.getByRole("menu", { name: "更多操作" });
    await expect(menu).toBeVisible();
    await expect(menu).toHaveScreenshot(`overflow-base-nova-${theme}.png`, {
      maxDiffPixelRatio: 0.04,
    });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await card.getByRole("button", { name: "提交", exact: true }).last().click();
    const dialog = card.getByRole("alertdialog", { name: "确认提交" });
    await expect(dialog.getByRole("button", { name: "取消" })).toBeFocused();
    await expect(dialog).toHaveScreenshot(`confirm-base-nova-${theme}.png`, {
      maxDiffPixelRatio: 0.04,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});

test("image Dialog handles arrows, trapped Tab, Escape, and outside press", async ({
  page,
}) => {
  await page.goto("/tests/visual/?case=media");
  const overlay = page.locator("#case-overlays");
  const trigger = overlay.getByRole("button", { name: "打开图片组预览" });

  await trigger.focus();
  await trigger.press("Space");
  let dialog = overlay.getByRole("dialog", { name: "第一张" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "上一张" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "下一张" })).toBeEnabled();
  await expect(dialog).toHaveScreenshot("card-renderer-image-preview.png");
  await dialog.press("ArrowRight");
  dialog = overlay.getByRole("dialog", { name: "第二张" });
  await expect(dialog).toContainText("2 / 2");
  await expect(dialog.getByRole("button", { name: "上一张" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "下一张" })).toBeDisabled();
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

test("choice popup and chips stay inside a 400px PC card", async ({ page }) => {
  await page.goto("/tests/visual/?case=choice");
  const host = page.locator("#case-choices-pc");
  const root = host.locator(".fcr-root");
  await expect(root).toBeVisible();
  const choiceFieldStyles = await host.locator(".fcr-ui-field").evaluateAll(
    (fields) => fields.map((field) => ({
      classes: field.className,
      gap: getComputedStyle(field).gap,
      isNaturallyUnclipped: field.scrollHeight === field.clientHeight,
    })),
  );
  expect(choiceFieldStyles).toEqual(Array.from({ length: 4 }, () => ({
    classes: "fcr-ui-field fcr-choice-field",
    gap: "4px",
    isNaturallyUnclipped: true,
  })));
  expect(await root.evaluate((node) => node.scrollWidth === node.clientWidth))
    .toBe(true);
  await expect(host.getByRole("button", { name: /^移除/ })).toHaveCount(3);
  await host.getByRole("combobox", { name: "Searchable Combobox" }).click();
  const popup = host.getByRole("dialog", { name: "Searchable Combobox选项" });
  await expect(popup).toBeVisible();
  await expect(host).toHaveScreenshot("card-choices-pc-compact.png");
});

test("PC Select and Combobox collide within a viewport narrower than 400px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/tests/visual/?case=choice-narrow");
  const host = page.locator("#case-choices-pc");
  const root = host.locator(".fcr-root");
  await expect(root).toBeVisible();
  expect(await root.evaluate((node) => node.scrollWidth <= node.clientWidth))
    .toBe(true);

  const assertInsideViewport = async (locator: import("@playwright/test").Locator) => {
    const bounds = await locator.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(360);
    expect(await locator.evaluate((node) => node.scrollWidth <= node.clientWidth))
      .toBe(true);
  };

  const select = host.getByRole("combobox", { name: "Small Select" });
  await assertInsideViewport(select);
  await select.click();
  const selectList = host.getByRole("listbox");
  await expect(selectList).toBeVisible();
  await assertInsideViewport(selectList);
  await page.keyboard.press("Escape");

  const single = host.getByRole("combobox", { name: "Searchable Combobox" });
  await assertInsideViewport(single);
  await single.click();
  const singlePopup = host.getByRole("dialog", {
    name: "Searchable Combobox选项",
  });
  await expect(singlePopup).toBeVisible();
  await assertInsideViewport(singlePopup);
  await assertInsideViewport(host.getByRole("option", {
    name: /intentionally long label/,
  }).first());
  await page.keyboard.press("Escape");

  const multiInput = host.getByRole("combobox", {
    name: "搜索Multiple choices",
  });
  await assertInsideViewport(multiInput);
  for (const remove of await host.getByRole("button", { name: /^移除/ }).all()) {
    await assertInsideViewport(remove);
  }
  await multiInput.click();
  await expect(multiInput).toHaveAttribute("aria-expanded", "true");
  const multiPopup = host.getByRole("listbox");
  await expect(multiPopup).toBeVisible();
  await assertInsideViewport(multiPopup);
  expect(await root.evaluate((node) => node.scrollWidth <= node.clientWidth))
    .toBe(true);
});

test("PC multi-select uses the pinned shadcn choice field height", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const host = page.locator("#case-choices-pc");
  const single = host.getByRole("combobox", { name: "Small Select" });
  const multipleControl = host.getByRole("combobox", {
    name: "搜索Multiple choices",
  });
  await expect(single).toBeVisible();
  await expect(multipleControl).toBeVisible();
  const [singleHeight, multipleHeight] = await Promise.all([
    single.evaluate((node) => node.getBoundingClientRect().height),
    multipleControl.evaluate((node) =>
      node.parentElement!.getBoundingClientRect().height),
  ]);
  expect(multipleHeight).toBe(singleHeight);
});

test("mobile choices use a keyboard-safe Drawer without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/visual/?case=mobile-choice");
  const host = page.locator("#case-choices-mobile");
  const root = host.locator(".fcr-root");
  expect(await root.evaluate((node) => node.scrollWidth === node.clientWidth))
    .toBe(true);
  await host.getByRole("button", { name: "Multiple choices，打开选项" }).click();
  const drawer = host.getByRole("dialog", { name: "Multiple choices" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("combobox", { name: "搜索Multiple choices" }))
    .toBeFocused();
  const bounds = await drawer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  await expect(drawer).toHaveScreenshot("card-choices-mobile-drawer.png");
});

test("mobile Drawer disables its motion under reduced-motion preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/visual/?case=mobile-choice");
  const host = page.locator("#case-choices-mobile");
  await host.getByRole("button", {
    name: "Multiple choices，打开选项",
  }).click();
  const drawer = host.getByRole("dialog", { name: "Multiple choices" });
  await expect(drawer).toBeVisible();
  const durations = await drawer.evaluate((node) =>
    getComputedStyle(node).transitionDuration.split(",").map((value) => {
      const trimmed = value.trim();
      return trimmed.endsWith("ms")
        ? Number.parseFloat(trimmed)
        : Number.parseFloat(trimmed) * 1000;
    }));
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.every((milliseconds) => milliseconds <= 0.01)).toBe(true);
});

test("mobile text choices update exactly once for pointer, keyboard, and emulated touch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const input of ["pointer", "keyboard", "touch"] as const) {
    await page.goto("/tests/visual/?case=mobile-choice");
    const host = page.locator("#case-choices-mobile");
    const trigger = host.getByRole("button", {
      name: "Searchable Combobox，打开选项",
    });
    await trigger.focus();
    const optionName = "Search option 12";
    if (input === "keyboard") {
      await trigger.press("Enter");
      const search = host.getByRole("combobox", {
        name: "搜索Searchable Combobox",
      });
      await expect(search).toBeFocused();
      await search.fill("option 12");
      await search.press("ArrowDown");
      await search.press("Enter");
    } else {
      await trigger.click();
      const option = host.getByRole("option", { name: optionName });
      if (input === "pointer") {
        await option.click();
      } else {
        const bounds = await option.boundingBox();
        expect(bounds).not.toBeNull();
        const session = await page.context().newCDPSession(page);
        const point = {
          x: bounds!.x + bounds!.width / 2,
          y: bounds!.y + bounds!.height / 2,
        };
        await withTouchEmulation(session, async () => {
          await session.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [point],
          });
          await session.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        });
      }
    }
    await expect(host.getByRole("dialog", { name: "Searchable Combobox" }))
      .toBeHidden();
    await host.getByRole("button", { name: "Submit choices" }).click();
    const actions = await host.locator("[data-choice-actions]").evaluate(
      (node) => JSON.parse(node.textContent || "[]") as unknown[],
    );
    expect(actions, input).toHaveLength(1);
    expect(JSON.stringify(actions[0])).toContain('"large":{"index":11}');
  }
});

test("400px dark mobile Drawer covers long searchable and resolved person options", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 844 });
  await page.goto("/tests/visual/?case=mobile-choice");
  const host = page.locator("#case-choices-mobile-dark");
  const root = host.locator(".fcr-root");
  await host.getByRole("button", {
    name: "Searchable Combobox，打开选项",
  }).click();
  const searchable = host.getByRole("dialog", {
    name: "Searchable Combobox",
  });
  await searchable.getByRole("combobox", {
    name: "搜索Searchable Combobox",
  }).fill("intentionally");
  await expect(searchable.getByRole("option", {
    name: "Search option with an intentionally long label that must wrap",
  })).toBeVisible();
  expect(await root.evaluate((node) => node.scrollWidth === node.clientWidth))
    .toBe(true);
  await expect(searchable).toHaveScreenshot(
    "card-choices-mobile-dark-long-400.png",
  );
  await searchable.getByRole("button", { name: "关闭选择器" }).click();

  await host.getByRole("button", { name: "Person，打开选项" }).click();
  const person = host.getByRole("dialog", { name: "Person" });
  await expect(person.getByRole("option", { name: "Ada Lovelace" }))
    .toBeVisible();
  await expect(person.getByRole("option", { name: "Grace Hopper" }))
    .toBeVisible();
  expect((await person.boundingBox())!.width).toBeLessThanOrEqual(400);
});

test("390px mobile person Drawer shows ready, loading, and error placeholders safely", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/visual/?case=mobile-choice");
  const host = page.locator("#case-choices-mobile-person-resources");
  await host.getByRole("button", {
    name: "Person resources，打开选项",
  }).click();
  const drawer = host.getByRole("dialog", { name: "Person resources" });
  await expect(drawer.getByRole("option", { name: "Resolved person" }))
    .toBeVisible();
  await expect(drawer.getByRole("option", { name: "人员信息加载中" }))
    .toBeVisible();
  await expect(drawer.getByRole("option", { name: "人员信息不可用" }))
    .toBeVisible();
  await expect(drawer).not.toContainText(
    /opaque-ready|opaque-loading|opaque-error|private resolver failure/,
  );
  expect((await drawer.boundingBox())!.width).toBeLessThanOrEqual(390);
  await expect(drawer).toHaveScreenshot(
    "card-choices-mobile-person-resources-390.png",
  );
});

test("mobile Drawer follows a simulated soft-keyboard visual viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const state = {
      height: window.innerHeight,
      offsetLeft: 0,
      offsetTop: 0,
      width: window.innerWidth,
    };
    const viewport = new EventTarget();
    Object.defineProperties(viewport, {
      height: { get: () => state.height },
      offsetLeft: { get: () => state.offsetLeft },
      offsetTop: { get: () => state.offsetTop },
      pageLeft: { get: () => state.offsetLeft },
      pageTop: { get: () => state.offsetTop },
      scale: { get: () => 1 },
      width: { get: () => state.width },
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    Object.defineProperty(window, "__setTestVisualViewport", {
      configurable: true,
      value: (next: Partial<typeof state>) => {
        Object.assign(state, next);
        viewport.dispatchEvent(new Event("resize"));
      },
    });
  });
  await page.goto("/tests/visual/?case=mobile-choice");
  const host = page.locator("#case-choices-mobile");
  const root = host.locator(".fcr-root");
  const trigger = host.getByRole("button", {
    name: "Multiple choices，打开选项",
  });
  await trigger.click();
  const drawer = host.getByRole("dialog", { name: "Multiple choices" });
  const search = drawer.getByRole("combobox", {
    name: "搜索Multiple choices",
  });
  await expect(search).toBeFocused();

  await page.evaluate(() => {
    const testWindow = window as unknown as Window & {
      __setTestVisualViewport: (next: {
        height: number;
        offsetTop: number;
        width: number;
      }) => void;
    };
    testWindow.__setTestVisualViewport({
      height: 420,
      offsetTop: 0,
      width: 390,
    });
  });
  await expect.poll(() => host.locator(".fcr-ui-drawer-viewport").evaluate(
    (node) => getComputedStyle(node).getPropertyValue("--drawer-keyboard-inset"),
  )).toBe("424px");

  const bounds = await drawer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(420);
  expect(await root.evaluate((node) => node.scrollWidth === node.clientWidth))
    .toBe(true);
  await expect(search).toBeFocused();

  await search.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator("[data-base-ui-inert]")).toHaveCount(0);
});

test("Select and Combobox preserve real-browser keyboard selection semantics", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const host = page.locator("#case-choices-pc");
  const select = host.getByRole("combobox", { name: "Small Select" });
  await select.focus();
  await select.press("Space");
  const selected = host.getByRole("option", { name: "Option two" });
  await expect(selected).toBeFocused();
  await selected.press("Home");
  const first = host.getByRole("option", { name: "Option one" });
  await expect(first).toBeFocused();
  await first.press("Space");
  await expect(select).toBeFocused();
  await expect(select).toContainText("Option one");

  await select.press("Space");
  await first.press("End");
  const last = host.getByRole("option", { name: "Option three" });
  await expect(last).toBeFocused();
  await last.press("Escape");
  await expect(select).toBeFocused();
  await expect(select).toContainText("Option one");

  const combobox = host.getByRole("combobox", { name: "Searchable Combobox" });
  await combobox.click();
  const search = host.getByRole("combobox", { name: "搜索Searchable Combobox" });
  await expect(search).toBeFocused();
  await search.fill("option 12");
  const match = host.getByRole("option", { name: "Search option 12" });
  await expect(match).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(host.getByRole("dialog", {
    name: "Searchable Combobox选项",
  })).toBeHidden();

  await combobox.click();
  await host.getByText("Small Select", { exact: true }).click();
  await expect(host.getByRole("dialog", {
    name: "Searchable Combobox选项",
  })).toBeHidden();

  const multi = host.getByRole("combobox", { name: "搜索Multiple choices" });
  await multi.focus();
  await multi.press("ArrowDown");
  const multiSearch = host.getByRole("combobox", {
    name: "搜索Multiple choices",
  });
  const done = host.getByRole("button", { name: "完成" });
  await expect(multiSearch).toBeFocused();
  await multiSearch.press("Tab");
  await expect(done).toBeFocused();
  await done.press("Shift+Tab");
  await expect(multiSearch).toBeFocused();
  await multiSearch.press("Escape");
  await expect(done).toBeHidden();
  await expect(multi).toBeFocused();
});

test("mobile Drawer closes by Esc, close button, and downward swipe with focus return", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/visual/?case=mobile-choice");
  const host = page.locator("#case-choices-mobile");
  const trigger = host.getByRole("button", {
    name: "Multiple choices，打开选项",
  });
  const drawer = host.getByRole("dialog", { name: "Multiple choices" });
  const search = host.getByRole("combobox", { name: "搜索Multiple choices" });

  await trigger.click();
  await expect(search).toBeFocused();
  await search.press("Shift+Tab");
  await expect(host.getByRole("button", { name: "关闭选择器" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(search).toBeFocused();
  await search.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.mouse.click(4, 4);
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await host.getByRole("button", { name: "关闭选择器" }).click();
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(drawer).toBeVisible();
  const sixth = drawer.getByRole("option", { name: "Long six choice" });
  await sixth.click();
  await expect(sixth).toHaveAttribute("aria-selected", "true");
  await expect(host.locator("[data-choice-actions]")).toHaveText("[]");
  const handle = host.locator(".fcr-ui-drawer-swipe-handle");
  const bounds = await handle.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.x + bounds!.width / 2;
  const startY = bounds!.y + bounds!.height / 2;
  const session = await page.context().newCDPSession(page);
  await withTouchEmulation(session, async () => {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: startY }],
    });
    for (const offset of [100, 200, 300, 400]) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: Math.min(startY + offset, 830) }],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  });
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(host.locator("[data-choice-actions]")).toHaveText("[]");
  await trigger.click();
  await expect(drawer.getByRole("option", { name: "Long six choice" }))
    .toHaveAttribute("aria-selected", "true");
});

test("form controls validate, focus, clear, reset, and submit once in a real browser", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const host = page.locator("#case-form-controls-pc");
  const form = host.locator("form");
  const title = form.getByRole("textbox", { name: "标题" });
  const details = form.getByRole("textbox", { name: "详情" });
  const terms = form.getByRole("checkbox", { name: "同意条款" });
  const firstImage = form.getByRole("checkbox", { name: "图片一" });

  await title.fill("");
  await form.getByRole("button", { name: "提交" }).click();
  await expect(title).toBeFocused();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByText("此项为必填项")).toBeVisible();

  await title.fill("已修正");
  await expect(title).not.toHaveAttribute("aria-invalid", "true");
  await expect(form.getByText("此项为必填项")).toBeHidden();
  await details.fill("已修改");
  await terms.click();
  await firstImage.click();
  await form.getByRole("button", { name: "重置" }).click();
  await expect(title).toHaveValue("初始标题");
  await expect(details).toHaveValue("初始详情");
  await expect(terms).toBeChecked();
  await expect(firstImage).toBeChecked();
  await expect(form.getByText("此项为必填项")).toBeHidden();

  await form.getByRole("button", { name: "提交" }).click();
  const actions = await host.locator("[data-form-control-actions]").evaluate(
    (node) => JSON.parse(node.textContent || "[]"),
  ) as Array<{ formValue?: Record<string, unknown> }>;
  expect(actions).toHaveLength(1);
  expect(actions[0]?.formValue).toMatchObject({
    title: "初始标题",
    details: "初始详情",
    terms: true,
    images: ["one"],
    date: "2026-07-28",
    time: "09:30",
    datetime: "2026-07-28T09:30",
  });
});

test("form-control state colors use the card-scoped public interaction token", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const lightRoot = page.locator("#case-form-controls-pc .fcr-root").first();
  const darkRoot = page.locator("#case-form-controls-dark .fcr-root").first();
  const title = lightRoot.getByRole("textbox", { name: "标题" });
  const description = lightRoot.getByText("用于显示在卡片顶部");

  await expect(title).toHaveAttribute("required", "");
  await expect(title).toHaveAttribute("placeholder", "请输入标题");
  const defaults = await Promise.all([lightRoot, darkRoot].map((root) =>
    root.evaluate((node) => getComputedStyle(node)
      .getPropertyValue("--fcr-interaction-muted-foreground").trim())));
  expect(defaults[0]).toBe("oklch(0.556 0 0)");
  expect(defaults[1]).toBe("oklch(0.708 0 0)");

  await lightRoot.evaluate((node) => {
    const root = node as HTMLElement;
    root.style.setProperty("--fcr-interaction-muted-foreground", "rgb(1 2 3)");
    for (const name of [...root.style]) {
      if (name.startsWith("--fcr-color-")) root.style.removeProperty(name);
    }
  });
  expect(await description.evaluate((node) => getComputedStyle(node).color))
    .toBe("rgb(1, 2, 3)");
  expect(await title.evaluate((node) =>
    getComputedStyle(node, "::placeholder").color)).toBe("rgb(1, 2, 3)");
  expect(await darkRoot.getByText("用于显示在卡片顶部")
    .evaluate((node) => getComputedStyle(node).color)).not.toBe("rgb(1, 2, 3)");

  await title.evaluate((node) => { (node as HTMLInputElement).disabled = true; });
  expect(await title.evaluate((node) => getComputedStyle(node).opacity))
    .toBe("0.5");
  await title.evaluate((node) => { (node as HTMLInputElement).disabled = false; });
  await title.fill("");
  await lightRoot.getByRole("button", { name: "提交" }).click();
  await expect(title).toHaveAttribute("aria-invalid", "true");
  const error = lightRoot.getByText("此项为必填项").first();
  await expect(error).toBeVisible();
  expect(await error.evaluate((node) => getComputedStyle(node).color))
    .not.toBe("rgb(1, 2, 3)");
});

test("PC Calendar supports focus, arrows, Escape, and timezone-preserving selection", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const host = page.locator("#case-form-controls-pc");
  const standalone = host.locator(".fcr-root").nth(1);
  const trigger = standalone.getByRole("combobox", {
    name: /^预约日期：/,
  });

  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await trigger.press("Enter");
  let dialog = standalone.getByRole("dialog", { name: "选择预约日期" });
  const previousMonth = dialog.getByRole("button", { name: "转到上个月" });
  const nextMonth = dialog.getByRole("button", { name: "转到下个月" });
  await expect(previousMonth).toBeEnabled();
  await expect(nextMonth).toBeEnabled();
  await previousMonth.click();
  await expect(dialog.getByRole("grid", { name: "2026年6月" })).toBeVisible();
  await nextMonth.click();
  await expect(dialog.getByRole("grid", { name: "2026年7月" })).toBeVisible();
  expect(await dialog.evaluate((node) =>
    node.closest("[data-fcr-portal-host]") !== null)).toBe(true);
  const viewport = page.viewportSize();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
  const selected = dialog.getByRole("button", {
    name: "2026-07-28，已选择",
  });
  await selected.focus();
  await expect(selected).toBeFocused();
  await selected.press("ArrowRight");
  const next = dialog.getByRole("button", { name: "2026-07-29" });
  await expect(next).toBeFocused();
  await next.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  const actions = await host.locator("[data-form-control-actions]").evaluate(
    (node) => JSON.parse(node.textContent || "[]"),
  ) as Array<{ value?: unknown; timezone?: string }>;
  expect(actions).toHaveLength(1);
  expect(actions[0]).toEqual({
    type: "callback",
    source: {
      tag: "date_picker",
      name: "date",
      elementId: "standalone_date",
      path: "$.body.elements[0]",
    },
    value: "2026-07-29",
    timezone: await page.evaluate(() =>
      Intl.DateTimeFormat().resolvedOptions().timeZone),
  });

  await trigger.press("Space");
  dialog = standalone.getByRole("dialog", { name: "选择预约日期" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("select_img preserves pointer, keyboard, and touch semantics in a real browser", async ({
  page,
}) => {
  await page.goto("/tests/visual/");
  const host = page.locator("#case-form-controls-pc");
  const form = host.locator("form");
  const multi = form.getByRole("checkbox", { name: "图片二" });
  await multi.focus();
  await multi.press("Space");
  await expect(multi).toBeChecked();
  const bounds = await multi.boundingBox();
  expect(bounds).not.toBeNull();
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const touchPoint = {
    x: bounds!.x + bounds!.width / 2,
    y: bounds!.y + bounds!.height / 2,
  };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touchPoint],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(multi).not.toBeChecked();
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await session.detach();

  const singleCard = host.locator(".fcr-root").nth(2);
  const second = singleCard.getByRole("radio", { name: "单图二" });
  await second.focus();
  await second.press("Space");
  await expect(second).toBeChecked();
  const actions = await host.locator("[data-form-control-actions]").evaluate(
    (node) => JSON.parse(node.textContent || "[]"),
  ) as Array<{ value?: unknown }>;
  expect(actions).toHaveLength(1);
  expect(actions[0]?.value).toBe("two");

  const ready = page.locator("#case-select-image-ready");
  const missing = page.locator("#case-select-image-missing");
  const error = page.locator("#case-select-image-error");

  await expect(ready.locator("img")).toHaveCount(2);
  await expect(ready.locator(".fcr-image-placeholder")).toHaveCount(0);
  await expect(missing.locator(
    '.fcr-image-placeholder[data-state="error"]',
  )).toHaveCount(2);
  await expect(error.locator(
    '.fcr-image-placeholder[data-state="error"]',
  )).toHaveCount(2);

  const readySecond = ready.getByRole("radio", { name: "Resource two" });
  await readySecond.click();
  await expect(readySecond).toBeChecked();

  const missingSecond = missing.getByRole("radio", { name: "Resource two" });
  await missingSecond.focus();
  await missingSecond.press("Space");
  await expect(missingSecond).toBeChecked();

  for (const host of [ready, missing]) {
    const actions = await host.locator("[data-select-image-actions]").evaluate(
      (node) => JSON.parse(node.textContent || "[]"),
    ) as Array<{ value?: unknown }>;
    expect(actions).toHaveLength(1);
    expect(actions[0]?.value).toBe("two");
  }
});

test("form controls cover light/dark, PC/mobile, widths, reduced motion, and scoped overflow", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-07-28T12:00:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/visual/");

  for (const id of [
    "case-form-controls-pc",
    "case-form-controls-dark",
    "case-form-controls-mobile",
  ]) {
    const host = page.locator(`#${id}`);
    const root = host.locator(".fcr-root").first();
    await expect(root).toBeVisible();
    expect(await root.evaluate((node) => node.scrollWidth <= node.clientWidth))
      .toBe(true);
  }

  const pc = page.locator("#case-form-controls-pc");
  const form = pc.locator("form");
  await form.getByRole("textbox", { name: "标题" }).fill("");
  await form.getByRole("button", { name: "提交" }).click();
  await expect(form).toHaveScreenshot("card-form-controls-error-compact.png");
  await captureHashEvidence(form, "card-form-controls-error-compact.png");

  await expect(page.locator("#case-form-controls-dark"))
    .toHaveScreenshot("card-form-controls-dark.png");
  await expect(page.locator("#case-form-controls-mobile"))
    .toHaveScreenshot("card-form-controls-mobile.png");

  await page.goto("/tests/visual/?case=date");
  const isolated = page.locator("#case-form-controls-pc .fcr-root").nth(1);
  await isolated.getByRole("combobox", {
    name: "预约日期：2026-07-28",
  }).click();
  const calendar = isolated.getByRole("dialog", { name: "选择预约日期" });
  await expect(calendar).toBeVisible();
  expect(await calendar.evaluate((node) =>
    getComputedStyle(node).transitionDuration)).toBe("0s");
  await expect(calendar).toHaveScreenshot("card-date-picker-popover.png");
});

test("table pagination keeps standard controls, keyboard behavior, and narrow overflow scoped", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/visual/?case=table-pagination");

  for (const name of ["compact", "default", "fill", "narrow"]) {
    const host = page.locator(`#case-table-pagination-${name}`);
    const root = host.locator(".fcr-root");
    const tableContainer = root.locator('[data-slot="table-container"]');
    const pagination = root.getByRole("navigation");
    const next = pagination.getByRole("button", { name: "下一页" });
    const previous = pagination.getByRole("button", { name: "上一页" });

    expect(await root.evaluate((node) => node.scrollWidth <= node.clientWidth))
      .toBe(true);
    expect(await pagination.evaluate((node) =>
      node.scrollWidth <= node.clientWidth)).toBe(true);
    if (name === "compact" || name === "narrow") {
      expect(await tableContainer.evaluate((node) =>
        node.scrollWidth > node.clientWidth)).toBe(true);
    }
    expect(await next.evaluate((node) =>
      node.getBoundingClientRect().width)).toBe(32);

    await next.focus();
    await next.press("Enter");
    await expect(pagination.locator('button[aria-current="page"]'))
      .toHaveAccessibleName("第 2 页，共 3 页");
    await next.press("Space");
    await expect(pagination.locator('button[aria-current="page"]'))
      .toHaveAccessibleName("第 3 页，共 3 页");
    await expect(next).toBeDisabled();
    await next.press("Enter");
    await expect(pagination.locator('button[aria-current="page"]'))
      .toHaveAccessibleName("第 3 页，共 3 页");
    await previous.focus();
    expect(await previous.evaluate((node) =>
      getComputedStyle(node).boxShadow)).not.toBe("none");
  }

  await expect(page.locator("main"))
    .toHaveScreenshot("table-pagination-base-nova-widths.png");
});
