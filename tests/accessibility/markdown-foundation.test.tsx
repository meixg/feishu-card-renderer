import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";

it("keeps bounded Markdown semantics accessible", async () => {
  const { container } = render(<CardRenderer card={{
    schema: "2.0",
    body: { elements: [{
      tag: "markdown",
      content: "# Heading\n\n- item\n  - nested\n\n> quote\n\n[link](https://example.com)\n\n"
        + "![blocked alt](https://example.com/image.png)",
    }] },
  }} />);
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});
