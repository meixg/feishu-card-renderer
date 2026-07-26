import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("rejects chart spec accessors without invoking them through CardRenderer", async () => {
    const nestedGetter = vi.fn(() => "executed");
    const chartSpec = { type: "bar" };
    Object.defineProperty(chartSpec, "label", {
      enumerable: true,
      get: nestedGetter,
    });
    const chartSpecGetter = vi.fn(() => ({ type: "bar" }));
    const accessorChart: Record<string, unknown> = { tag: "chart" };
    Object.defineProperty(accessorChart, "chart_spec", {
      enumerable: true,
      get: chartSpecGetter,
    });

    const { container } = render(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [
          { tag: "chart", chart_spec: chartSpec },
          accessorChart,
        ],
      },
    }} />);
    await act(async () => {});

    expect(nestedGetter).not.toHaveBeenCalled();
    expect(chartSpecGetter).not.toHaveBeenCalled();
    expect(runtime.load).not.toHaveBeenCalled();
    const chartResults = [...container.querySelectorAll(".fcr-chart")];
    expect(chartResults).toHaveLength(2);
    for (const result of chartResults) {
      expect(result).toHaveTextContent("图表配置不安全");
    }
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

  it("mounts and releases a safe chart through the shared preview layer", async () => {
    const base = chart(1);
    const previewCard = {
      ...base,
      body: { elements: [{ ...base.body.elements[0], preview: true }] },
    };
    const { container, unmount } = render(<CardRenderer card={previewCard} />);
    await act(async () => {});
    expect(runtime.createChart).toHaveBeenCalledTimes(1);

    fireEvent.click(within(container).getByRole(
      "button", { name: "打开图表预览" },
    ));
    await act(async () => {});
    const dialog = within(container).getByRole("dialog");
    expect(within(dialog).getByRole("img", { name: "图表预览" }))
      .toHaveAttribute("data-chart-result", "safe");
    expect(runtime.createChart).toHaveBeenCalledTimes(2);

    fireEvent.click(within(dialog).getByRole(
      "button", { name: "关闭预览" },
    ));
    expect(runtime.release).toHaveBeenCalledTimes(1);
    unmount();
    expect(runtime.release).toHaveBeenCalledTimes(2);
  });
});
