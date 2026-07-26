import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CardRenderer } from "../../src";
import { renderCardToString } from "../utils/ssr";

describe("package entry", () => {
  it("exports an SSR-safe CardRenderer", () => {
    const html = renderToString(<CardRenderer card={{ schema: "2.0" }} />);

    expect(html).toContain('data-fcr-card-renderer="ready"');
    expect(renderCardToString({ schema: "2.0" })).toBe(html);
  });
});
