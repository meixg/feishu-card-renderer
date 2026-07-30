import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";

it("keeps localized table pagination free of detectable accessibility violations", async () => {
  const { container } = render(<CardRenderer locale="en_US" card={{
    schema: "2.0",
    body: { elements: [{
      tag: "table",
      page_size: 1,
      columns: [{ name: "value", display_name: "Value" }],
      rows: [{ value: "one" }, { value: "two" }, { value: "three" }],
    }] },
  }} />);
  expect((await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  })).violations).toEqual([]);
});
