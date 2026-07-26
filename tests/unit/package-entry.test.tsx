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

  it("keeps image resolution hydration-only during SSR", () => {
    let calls = 0;
    const html = renderToString(<CardRenderer
      resolveImage={() => {
        calls += 1;
        return "https://example.com/image.png";
      }}
      card={{ schema: "2.0", body: { elements: [{
        tag: "img", img_key: "private",
        alt: { tag: "plain_text", content: "Preview" },
      }] } }}
    />);

    expect(calls).toBe(0);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("private");
    expect(html).toContain('data-state="loading"');
  });
});
