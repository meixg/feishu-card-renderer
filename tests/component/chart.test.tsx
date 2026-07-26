import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  createChart: vi.fn(),
  load: vi.fn(),
  release: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../../src/adapters/vchart-loader", () => ({
  loadVChartRuntime: runtime.load,
}));

import { CardRenderer } from "../../src";

const chart = (value: number) => ({
  schema: "2.0",
  body: { elements: [{
    tag: "chart",
    chart_spec: {
      type: "bar",
      data: [{ id: "data", values: [{ x: "a", y: value }] }],
      xField: "x",
      yField: "y",
      media: [],
    },
  }] },
});

describe("Chart lifecycle", () => {
  beforeEach(() => {
    runtime.createChart.mockReset();
    runtime.load.mockReset();
    runtime.release.mockReset();
    runtime.update.mockReset();
    runtime.createChart.mockReturnValue({
      release: runtime.release,
      update: runtime.update,
    });
    runtime.load.mockResolvedValue({ createChart: runtime.createChart });
  });

  it("loads after mount, safely rebuilds on spec update, and releases on unmount", async () => {
    const { rerender, unmount } = render(<CardRenderer card={chart(1)} />);
    expect(screen.getByRole("img", { name: "图表" })).toHaveTextContent("图表加载中");
    await act(async () => {});
    expect(runtime.createChart).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".fcr-chart")).toHaveAttribute("data-state", "ready");

    rerender(<CardRenderer card={chart(2)} />);
    await act(async () => {});
    expect(runtime.release).toHaveBeenCalledTimes(1);
    expect(runtime.createChart).toHaveBeenCalledTimes(2);

    unmount();
    expect(runtime.release).toHaveBeenCalledTimes(2);
  });

  it("does not load VChart for an unsafe spec", async () => {
    render(<CardRenderer card={{
      schema: "2.0",
      body: { elements: [{ tag: "chart", chart_spec: {
        type: "bar", formatter: () => "unsafe",
      } }] },
    }} />);
    await act(async () => {});
    expect(runtime.createChart).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "图表" }))
      .toHaveTextContent("图表配置不安全");
  });

  it("does not load the runtime for chartless cards", async () => {
    render(<CardRenderer card={{
      schema: "2.0",
      body: { elements: [{ tag: "div", text: {
        tag: "plain_text", content: "no chart",
      } }] },
    }} />);
    await act(async () => {});
    expect(runtime.load).not.toHaveBeenCalled();
  });

  it("ignores a runtime import that settles after unmount", async () => {
    let finish!: (value: { createChart: typeof runtime.createChart }) => void;
    runtime.load.mockReturnValue(new Promise((resolve) => {
      finish = resolve;
    }));
    const { unmount } = render(<CardRenderer card={chart(1)} />);
    unmount();
    await act(async () => finish({ createChart: runtime.createChart }));
    expect(runtime.createChart).not.toHaveBeenCalled();
  });
});
