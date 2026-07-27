import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { expect, it } from "vitest";

import { CardRenderer } from "../../src";

it("keeps code and read-only task states accessible on mobile compact cards", async () => {
  const { container } = render(<CardRenderer device="mobile" card={{
    schema: "2.0",
    config: { width_mode: "compact" },
    body: { elements: [{
      tag: "markdown",
      content: "```js\nconst value = 'selectable';\n```\n\n- [ ] pending\n- [x] done",
    }] },
  }} />);

  expect((await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  })).violations).toEqual([]);
});
