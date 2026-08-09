import { expect, test } from "@playwright/test";

function rgb(value: string) {
  const match = value.match(/\d+(?:\.\d+)?/gu);
  if (!match || match.length < 3) throw new Error(`无法解析颜色：${value}`);
  return match.slice(0, 3).map(Number);
}

function luminance(color: number[]) {
  const channels = color.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string) {
  const firstLuminance = luminance(rgb(first));
  const secondLuminance = luminance(rgb(second));
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

test("Playground editor has a visible cursor and accepts keyboard input", async ({ page }) => {
  await page.goto("/feishu-card-renderer/");
  const editor = page.getByRole("textbox", { name: "飞书卡片 JSON 2.0" });
  await editor.click();

  const colors = await page.locator(".playground-code-editor").evaluate((host) => ({
    background: getComputedStyle(host.querySelector(".cm-editor")!).backgroundColor,
    cursor: getComputedStyle(host.querySelector(".cm-cursor")!).borderLeftColor,
  }));
  expect(contrast(colors.background, colors.cursor)).toBeGreaterThanOrEqual(3);

  const replacement = '{"schema":"2.0","body":{"elements":[]}}';
  await page.keyboard.press("Control+A");
  await page.keyboard.type(replacement);
  await expect(editor).toHaveText(replacement);
});
