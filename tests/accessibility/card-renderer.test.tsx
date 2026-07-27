import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it, vi } from "vitest";

vi.mock("../../src/adapters/vchart-loader", () => ({
  loadVChartRuntime: async () => ({
    createChart: () => ({ update: vi.fn(), release: vi.fn() }),
  }),
}));

import { CardRenderer } from "../../src";
import { completeComplexContentCard } from "../../src/fixtures/complex-content";
import { completeContainerCard } from "../../src/fixtures/container-cards";
import { completeInteractiveCard } from "../../src/fixtures/interactive-card";

it("has no detectable accessibility violations", async () => {
  const { container } = render(<CardRenderer card={{ schema: "2.0",
    header: { title: { tag: "plain_text", content: "Title" } },
    body: { elements: [{ tag: "img", img_key: "x",
      alt: { tag: "plain_text", content: "Diagram" } }] },
  }} />);
  // jsdom cannot compute layout/canvas contrast; release-audit.test.ts checks
  // every shipped theme token numerically instead.
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  expect(results.violations).toEqual([]);
});

it("keeps complex content and preview controls accessible", async () => {
  const { container } = render(<CardRenderer card={completeComplexContentCard}
    resolveImage={(key) => `https://cdn.example.com/${key}.png`}
    resolvePerson={(id) => ({ id, name: "Person" })} />);
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});

it("keeps recursive containers and disclosure controls accessible", async () => {
  const { container } = render(
    <CardRenderer card={completeContainerCard} />,
  );
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});

it("keeps form controls, menus, and business-action disabled states accessible", async () => {
  const { container } = render(
    <CardRenderer card={completeInteractiveCard} />,
  );
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});
