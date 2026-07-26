import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";
import { completeComplexContentCard } from "../../src/fixtures/complex-content";

it("has no detectable accessibility violations", async () => {
  const { container } = render(<CardRenderer card={{ schema: "2.0",
    header: { title: { tag: "plain_text", content: "Title" } },
    body: { elements: [{ tag: "img", img_key: "x",
      alt: { tag: "plain_text", content: "Diagram" } }] },
  }} />);
  const results = await axe(container, {
    rules: {
      "color-contrast": { enabled: false },
    },
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
