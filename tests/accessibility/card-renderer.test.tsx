import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";

it("has no detectable accessibility violations", async () => {
  const { container } = render(<CardRenderer card={{ schema: "2.0" }} />);
  const results = await axe(container, {
    rules: {
      "color-contrast": { enabled: false },
    },
  });

  expect(results.violations).toEqual([]);
});
