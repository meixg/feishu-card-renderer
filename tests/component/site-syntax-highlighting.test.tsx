import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  SyntaxHighlightedCode,
} from "../../site/src/SyntaxHighlightedCode";
import { tokenizeCode } from "../../site/src/syntax-tokenizer";

describe("site syntax highlighting", () => {
  it("classifies JSON properties, values, numbers, and literals", () => {
    const tokens = tokenizeCode('{"schema":"2.0","count":2,"ok":true}', "json");
    expect(tokens).toEqual(expect.arrayContaining([
      { kind: "property", value: '"schema"' },
      { kind: "string", value: '"2.0"' },
      { kind: "number", value: "2" },
      { kind: "keyword", value: "true" },
    ]));
  });

  it("renders hostile-looking source only as text nodes", () => {
    const source = '<script>alert("x")</script>';
    const { container } = render(
      <pre><SyntaxHighlightedCode code={source} language="tsx" /></pre>,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toBe(source);
    expect(container.querySelector('[data-syntax-token="string"]'))
      .toHaveTextContent('"x"');
  });
});
