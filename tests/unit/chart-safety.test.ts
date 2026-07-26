import { describe, expect, it, vi } from "vitest";

import {
  FEISHU_CHART_TYPES,
  FEISHU_MOBILE_CHART_LIMITATIONS,
  sanitizeChartSpec,
} from "../../src/adapters/chart";

describe("chart spec safety boundary", () => {
  it("deep-clones pure data without mutating the input", () => {
    const input = {
      type: "bar",
      data: [{ id: "data", values: [{ x: "a", y: 1 }] }],
      media: [],
    };
    const result = sanitizeChartSpec(input);
    expect(result).toMatchObject({ ok: true, spec: input });
    if (result.ok) {
      expect(result.spec).not.toBe(input);
      expect(result.spec.data).not.toBe(input.data);
    }
  });

  it.each([
    { type: "bar", formatter: () => "owned" },
    { type: "bar", tooltip: { handler: "globalThis.alert(1)" } },
    JSON.parse('{"type":"bar","__proto__":{"polluted":true}}'),
    JSON.parse('{"type":"bar","constructor":{"prototype":{"polluted":true}}}'),
    { type: "bar", label: { html: "<img onerror=alert(1)>" } },
    { type: "bar", extensionMark: [{ image: "repeat" }] },
    { type: "bar", onClick: "doSomething" },
    { type: "bar", value: "javascript:alert(1)" },
  ])("rejects executable or extension input %#", (input) => {
    expect(sanitizeChartSpec(input)).toMatchObject({ ok: false });
  });

  it.each([
    { type: "bar", tooltip: { renderMode: "html" } },
    { type: "html", data: [] },
    { type: "bar", label: { renderMode: "dom" } },
    { type: "bar", tooltip: { renderMode: "react-dom" } },
  ])("rejects HTML and DOM rendering modes %#", (input) => {
    expect(sanitizeChartSpec(input)).toMatchObject({
      ok: false,
      reason: "unsafe",
    });
  });

  it.each([undefined, null, [], new Date(), { value: NaN }])(
    "rejects non-JSON data %#",
    (input) => {
      expect(sanitizeChartSpec(input)).toMatchObject({ ok: false });
    },
  );

  it("documents the Feishu compatibility surface without claiming all VChart types", () => {
    expect(FEISHU_CHART_TYPES).toContain("bar");
    expect(FEISHU_CHART_TYPES).not.toContain("map");
    expect(FEISHU_MOBILE_CHART_LIMITATIONS).toContain("word-cloud-grid");
  });

  it("rejects accessors without invoking them", () => {
    const getter = vi.fn(() => "executed");
    const input = { type: "bar" };
    Object.defineProperty(input, "label", { enumerable: true, get: getter });
    expect(sanitizeChartSpec(input)).toMatchObject({ ok: false, reason: "unsafe" });
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects array accessors without invoking them", () => {
    const getter = vi.fn(() => ({ x: "executed" }));
    const values: unknown[] = [];
    Object.defineProperty(values, "0", {
      enumerable: true,
      get: getter,
    });
    expect(sanitizeChartSpec({ type: "bar", data: values })).toMatchObject({
      ok: false,
      reason: "unsafe",
    });
    expect(getter).not.toHaveBeenCalled();
  });
});
