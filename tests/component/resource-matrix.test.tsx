import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/adapters/vchart-loader", () => ({
  loadVChartRuntime: async () => ({
    createChart: () => ({ update: vi.fn(), release: vi.fn() }),
  }),
}));

import { CardRenderer } from "../../src";
import { compatibilityFixturesByTag } from "../../src/fixtures/compatibility-matrix";

const imageTags = ["img", "img_combination", "select_img"] as const;
const personTags = ["person", "person_list"] as const;

describe("per-tag resource fixtures", () => {
  it.each(imageTags)("%s covers missing, resolved, rejected, and aborted images", async (tag) => {
    const card = compatibilityFixturesByTag[tag].complete;
    const missing = render(<CardRenderer card={card} />);
    expect(missing.container.querySelector("img")).toBeNull();
    expect(missing.container.textContent).not.toMatch(/complete-image|one|two/);
    missing.unmount();

    const resolved = render(<CardRenderer card={card}
      resolveImage={(key) => `https://cdn.example.com/${key}.png`} />);
    await act(async () => {});
    expect(resolved.container.querySelector("img")).not.toBeNull();
    resolved.unmount();

    const rejected = render(<CardRenderer card={card}
      resolveImage={() => "javascript:alert(1)"} />);
    await act(async () => {});
    expect(rejected.container.querySelector("img")).toBeNull();
    rejected.unmount();

    const signals: AbortSignal[] = [];
    const pending = render(<CardRenderer card={card}
      resolveImage={(_key, signal) => {
        signals.push(signal);
        return new Promise(() => {});
      }} />);
    expect(signals.length).toBeGreaterThan(0);
    pending.unmount();
    expect(signals.every(({ aborted }) => aborted)).toBe(true);
  });

  it.each(personTags)("%s covers missing, resolved, rejected, and aborted people", async (tag) => {
    const card = compatibilityFixturesByTag[tag].complete;
    const missing = render(<CardRenderer card={card} />);
    expect(missing.container.textContent).not.toContain("person-a");
    missing.unmount();

    const resolved = render(<CardRenderer card={card}
      resolvePerson={(id) => ({ id, name: `Resolved ${id.at(-1)}` })} />);
    await act(async () => {});
    expect(resolved.container.textContent).toContain("Resolved");
    resolved.unmount();

    const rejected = render(<CardRenderer card={card}
      resolvePerson={() => undefined} />);
    await act(async () => {});
    expect(rejected.container.textContent).not.toContain("person-a");
    rejected.unmount();

    const signals: AbortSignal[] = [];
    const pending = render(<CardRenderer card={card}
      resolvePerson={(_id, signal) => {
        signals.push(signal);
        return new Promise(() => {});
      }} />);
    expect(signals.length).toBeGreaterThan(0);
    pending.unmount();
    expect(signals.every(({ aborted }) => aborted)).toBe(true);
  });

  it("chart declares runtime evidence instead of pretending to use a host adapter", () => {
    const resource = compatibilityFixturesByTag.chart.resource;
    expect(resource.kind).toBe("chart");
    expect(resource.modes).toEqual([
      "missing", "resolved", "rejected", "aborted",
    ]);
  });
});
