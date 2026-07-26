import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";

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
