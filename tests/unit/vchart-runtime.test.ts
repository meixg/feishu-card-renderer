import { beforeEach, describe, expect, it, vi } from "vitest";

const vchart = vi.hoisted(() => ({
  release: vi.fn(),
  renderSync: vi.fn(),
}));

vi.mock("@visactor/vchart", () => ({
  default: vi.fn(function MockVChart() {
    return {
      release: vchart.release,
      renderSync: vchart.renderSync,
      updateSpecSync: vi.fn(),
    };
  }),
}));

import { createChart } from "../../src/adapters/vchart-runtime";

describe("VChart runtime", () => {
  beforeEach(() => {
    vchart.release.mockReset();
    vchart.renderSync.mockReset();
  });

  it("releases a constructed chart when its initial render throws", () => {
    vchart.renderSync.mockImplementation(() => {
      throw new Error("render failed");
    });

    expect(() => createChart(
      {} as HTMLElement,
      { type: "bar" },
      { colorScheme: "light", device: "pc" },
    )).toThrow("render failed");
    expect(vchart.release).toHaveBeenCalledTimes(1);
  });
});
