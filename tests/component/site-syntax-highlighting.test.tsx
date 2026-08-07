import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SyntaxHighlightedCode } from "../../site/src/SyntaxHighlightedCode";

describe("site syntax highlighting", () => {
  it("uses CodeMirror language tags for JSON and TSX", () => {
    const { container } = render(<>
      <SyntaxHighlightedCode
        code={'{"schema":"2.0","count":2,"ok":true}'} language="json" />
      <SyntaxHighlightedCode code="<CardRenderer card={payload} />"
        language="tsx" />
    </>);

    expect(container.querySelector(".language-json .tok-propertyName"))
      .toHaveTextContent('"schema"');
    expect(container.querySelector(".language-json .tok-string"))
      .toHaveTextContent('"2.0"');
    expect(container.querySelector(".language-json .tok-number"))
      .toHaveTextContent("2");
    expect(container.querySelector(".language-json .tok-bool"))
      .toHaveTextContent("true");
    expect(container.querySelector(".language-tsx .tok-typeName"))
      .toHaveTextContent("CardRenderer");
    expect(container.querySelector(".language-tsx .tok-propertyName"))
      .toHaveTextContent("card");
  });

  it("renders shell commands as unmodified plain text", () => {
    const source = "pnpm add feishu-card-renderer react react-dom";
    const { container } = render(
      <SyntaxHighlightedCode code={source} language="plain" />,
    );

    expect(container.textContent).toBe(source);
    expect(container.querySelector("span")).toBeNull();
  });

  it("renders hostile-looking source only as text nodes", () => {
    const source = 'const value = "<script>alert(\'x\')</script>";';
    const { container } = render(
      <pre><SyntaxHighlightedCode code={source} language="tsx" /></pre>,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toBe(source);
    expect(container.querySelector(".tok-string"))
      .toHaveTextContent('"<script>alert(\'x\')</script>"');
  });
});
