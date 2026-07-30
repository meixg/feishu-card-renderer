import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");
const buttonCss = readFileSync("src/styles/button-nova.css", "utf8");
const formControlCss = readFileSync("src/styles/form-controls-nova.css", "utf8");
const overlayCss = readFileSync("src/styles/overlays-nova.css", "utf8");

function token(selector: string, name: string): string {
  const block = css.match(new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  ))?.[1];
  const value = block?.match(new RegExp(
    `--${name}:\\s*(#[0-9a-fA-F]{6}|oklch\\([^;]+\\))`,
  ))?.[1];
  if (!value) throw new Error(`Missing ${name} in ${selector}`);
  return value;
}

const lightSurface = token(".fcr-root", "fcr-color-surface");
const lightText = token(".fcr-root", "fcr-color-text");
const lightSecondary = token(".fcr-root", "fcr-color-text-secondary");
const darkSurface = token(".fcr-theme-dark", "fcr-color-surface");
const darkText = token(".fcr-theme-dark", "fcr-color-text");
const darkSecondary = token(".fcr-theme-dark", "fcr-color-text-secondary");

function luminance(color: string): number {
  const oklch = color.match(/^oklch\(([\d.]+)\s+0\s+0\)$/);
  if (oklch) return Number(oklch[1]) ** 3;
  const channels = color.match(/[0-9a-f]{2}/gi);
  if (!channels || channels.length !== 3) throw new Error(`Invalid color ${color}`);
  const values = channels.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)]
    .sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("1.0 accessibility release audit", () => {
  it.each([
    ["light primary text", lightText, lightSurface, 4.5],
    ["light secondary text", lightSecondary, lightSurface, 4.5],
    ["dark primary text", darkText, darkSurface, 4.5],
    ["dark secondary text", darkSecondary, darkSurface, 4.5],
  ])("%s meets the WCAG contrast threshold", (_name, foreground, background, ratio) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(ratio);
  });

  it("defines visible keyboard focus for every custom interactive surface", () => {
    for (const selector of [
      ".fcr-preview-trigger:focus-visible",
      ".fcr-collapsible-trigger:focus-visible",
      ".fcr-ui-input:focus-visible",
      ".fcr-ui-textarea:focus-visible",
      ".fcr-ui-checkbox:focus-visible",
      ".fcr-ui-radio:focus-visible",
      ".fcr-ui-button:focus-visible",
      ".fcr-ui-dropdown-menu-item:is(:focus, [data-highlighted])",
    ]) {
      expect(`${css}\n${buttonCss}\n${formControlCss}\n${overlayCss}`)
        .toContain(selector);
    }
  });

  it("keeps pinned base-nova menu and Alert Dialog static results scoped", () => {
    expect(overlayCss).toContain("padding: 4px 6px");
    expect(overlayCss).toContain("font-size: 14px; line-height: 20px");
    expect(overlayCss).toContain("background: rgb(0 0 0 / 10%)");
    expect(overlayCss).toContain("backdrop-filter: blur(4px)");
    expect(overlayCss).toContain("width: calc(100% - 32px); max-width: 320px");
    expect(overlayCss).toContain("padding: 16px");
    expect(overlayCss).toContain("border-radius: 12px");
    expect(overlayCss).toContain("margin: 0 -16px -16px");
    expect(overlayCss).toContain("animation-duration: 100ms");
  });

  it("keeps the documented focus ring neutral in both themes", () => {
    expect(buttonCss).toContain("--fcr-interaction-focus: oklch(0.708 0 0)");
    expect(buttonCss).toContain("--fcr-interaction-focus: oklch(0.556 0 0)");
    expect(buttonCss).toContain("--fcr-ui-ring: var(--fcr-interaction-focus)");
  });

  it("removes transitions and smooth scrolling for reduced-motion users", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/\.fcr-root \*[^}]*transition: none !important/s);
    expect(css).toMatch(/scroll-behavior: auto !important/);
  });
});
