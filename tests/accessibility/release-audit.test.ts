import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");

function token(selector: string, name: string): string {
  const block = css.match(new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  ))?.[1];
  const value = block?.match(new RegExp(
    `--${name}:\\s*(#[0-9a-fA-F]{6})`,
  ))?.[1];
  if (!value) throw new Error(`Missing ${name} in ${selector}`);
  return value;
}

const lightSurface = token(".fcr-root", "fcr-color-surface");
const lightText = token(".fcr-root", "fcr-color-text");
const lightSecondary = token(".fcr-root", "fcr-color-text-secondary");
const focus = token(".fcr-root", "fcr-color-primary");
const darkSurface = token(".fcr-theme-dark", "fcr-color-surface");
const darkText = token(".fcr-theme-dark", "fcr-color-text");
const darkSecondary = token(".fcr-theme-dark", "fcr-color-text-secondary");

function luminance(hex: string): number {
  const channels = hex.match(/[0-9a-f]{2}/gi);
  if (!channels || channels.length !== 3) throw new Error(`Invalid color ${hex}`);
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
    ["focus indicator", focus, lightSurface, 3],
  ])("%s meets the WCAG contrast threshold", (_name, foreground, background, ratio) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(ratio);
  });

  it("defines visible keyboard focus for every custom interactive surface", () => {
    for (const selector of [
      ".fcr-preview-trigger:focus-visible",
      ".fcr-collapsible-trigger:focus-visible",
      ".fcr-field :focus-visible",
      ".fcr-button:focus-visible",
      ".fcr-overflow button:focus-visible",
      ".fcr-overflow-menu-item:focus-visible",
      ".fcr-checker input:focus-visible",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("removes transitions and smooth scrolling for reduced-motion users", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/\.fcr-root \*[^}]*transition: none !important/s);
    expect(css).toMatch(/scroll-behavior: auto !important/);
  });
});
