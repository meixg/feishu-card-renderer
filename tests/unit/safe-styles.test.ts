import { describe, expect, it } from "vitest";

import { safeBox, safePx, safeRgba, safeSpacing, safeUrl } from "../../src/styles/safe";

describe("untrusted style and URL parsing", () => {
  it("accepts only bounded protocol px and spacing values", () => {
    expect(safePx("99px")).toBe("99px");
    expect(safePx("-1px")).toBeUndefined();
    expect(safeBox("-1px 2px", true)).toBe("-1px 2px");
    expect(safeBox("1px 2px 3px", false)).toBeUndefined();
    expect(safeSpacing("extra_large")).toBe("16px");
    expect(safeSpacing("100px")).toBeUndefined();
  });

  it("rejects CSS and URL injection", () => {
    expect(safeRgba("rgba(5,157,178,0.52)")).toBeTruthy();
    expect(safeRgba("rgba(999,0,0,1)")).toBeUndefined();
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
  });
});
