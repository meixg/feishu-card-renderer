import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { Playground } from "../../site/src/Playground";

it("keeps the JSON editor and live preview accessible", async () => {
  const { container } = render(
    <Playground theme="light" device="pc" />,
  );
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  expect(results.violations).toEqual([]);
});
