import { render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";
import { completeMarkdownTableCard } from "../../src/fixtures/renderer-cards";

it("exposes Markdown table relationships to assistive technology", async () => {
  const { container } = render(<CardRenderer card={completeMarkdownTableCard} />);
  const table = within(container).getByRole("table");
  expect(within(table).getAllByRole("columnheader")).toHaveLength(5);
  expect(within(table).getAllByRole("cell")).toHaveLength(15);

  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});
