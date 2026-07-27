import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import {
  completeMarkdownFoundationCard,
  invalidMarkdownFoundationCard,
  minimalMarkdownCard,
} from "../../src/fixtures/renderer-cards";

function card(content: string, after = "after markdown") {
  return {
    schema: "2.0",
    body: {
      elements: [
        { tag: "markdown", content },
        { tag: "div", text: { tag: "plain_text", content: after } },
      ],
    },
  } as const;
}

describe("bounded markdown semantics through CardRenderer", () => {
  it("keeps the minimal, complete, and invalid fixtures independently demonstrable", async () => {
    const onDiagnostic = vi.fn();
    const minimal = render(<CardRenderer card={minimalMarkdownCard} />);
    expect(within(minimal.container).getByText("A paragraph.").tagName).toBe("P");
    minimal.unmount();

    const complete = render(<CardRenderer card={completeMarkdownFoundationCard} />);
    expect(within(complete.container).getByRole("heading", {
      name: "基础语义",
    })).toBeVisible();
    complete.unmount();

    const invalid = render(<CardRenderer card={invalidMarkdownFoundationCard}
      onDiagnostic={onDiagnostic} />);
    expect(within(invalid.container).getByText("替代文本")).toBeVisible();
    expect(invalid.container.querySelector("img, future-tag")).toBeNull();
    await act(async () => {});
    expect(onDiagnostic.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "markdown_unsupported_markup" }),
      expect.objectContaining({ code: "markdown_image_blocked" }),
      expect.objectContaining({ code: "unsafe_url" }),
    ]));
  });

  it("renders the #16 CommonMark whitelist as semantic React nodes", () => {
    const { container } = render(<CardRenderer card={card([
      "# Heading",
      "",
      "A *gentle* **strong** ~~removed~~ [safe link](https://example.com/path).",
      "",
      "- first",
      "  1. nested",
      "  2. second",
      "",
      "> quoted",
      "",
      "---",
    ].join("\n"))} />);

    expect(screen.getByRole("heading", { level: 1, name: "Heading" })).toBeVisible();
    const paragraph = container.querySelector<HTMLElement>(
      ".fcr-markdown-content > p",
    );
    expect(paragraph).not.toBeNull();
    expect(within(paragraph!).getByText("gentle").tagName).toBe("EM");
    expect(within(paragraph!).getByText("strong").tagName).toBe("STRONG");
    expect(within(paragraph!).getByText("removed").tagName).toBe("DEL");
    expect(screen.getByRole("link", { name: "safe link" })).toHaveAttribute(
      "rel", "noopener noreferrer",
    );
    expect(container.querySelector("ul ol")).not.toBeNull();
    expect(container.querySelector("blockquote")).toHaveTextContent("quoted");
    expect(container.querySelector(".fcr-markdown-content > hr")).not.toBeNull();
  });

  it("keeps raw HTML and unknown Feishu extensions visible and inert", async () => {
    const onDiagnostic = vi.fn();
    const { container } = render(<CardRenderer
      card={card("<script>alert(1)</script>\n\n<at id=all></at>")}
      onDiagnostic={onDiagnostic}
    />);
    expect(screen.getByText("<script>alert(1)</script>")).toBeVisible();
    expect(screen.getByText("<at id=all></at>")).toBeVisible();
    expect(container.querySelector("script, at")).toBeNull();
    await act(async () => {});
    expect(onDiagnostic.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "markdown_unsupported_markup" }),
    ]));
  });

  it("blocks Markdown images and unsafe links without network-capable elements", async () => {
    const onDiagnostic = vi.fn();
    const { container } = render(<CardRenderer
      card={card("![architecture](https://tracker.example/pixel.png) [bad](javascript:alert(1))")}
      onDiagnostic={onDiagnostic}
    />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("architecture")).toBeVisible();
    expect(screen.queryByRole("link", { name: "bad" })).toBeNull();
    await act(async () => {});
    expect(onDiagnostic.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "markdown_image_blocked" }),
      expect.objectContaining({ code: "unsafe_url" }),
    ]));
  });

  it("keeps lark_md on its existing limited semantics", () => {
    const { container } = render(<CardRenderer card={{
      schema: "2.0",
      body: { elements: [{
        tag: "div",
        text: { tag: "lark_md", content: "# Not a heading\n- Not a list\n~~not deleted~~" },
      }] },
    }} />);
    expect(container.querySelector("h1, ul, ol, del")).toBeNull();
    expect(screen.getByText(/# Not a heading/)).toBeVisible();
  });

  it("bounds characters and collections, preserves a safe prefix, and continues the card", async () => {
    const onDiagnostic = vi.fn();
    const long = `# Safe prefix\n\n${"[link](https://example.com) ".repeat(1500)}`;
    const { container } = render(
      <CardRenderer card={card(long)} onDiagnostic={onDiagnostic} />,
    );
    const result = within(container);
    expect(result.getByRole("heading", { name: "Safe prefix" })).toBeVisible();
    expect(result.getByRole("note", { name: "Markdown 内容已截断" })).toBeVisible();
    expect(result.getByText("after markdown")).toBeVisible();
    expect(result.getAllByRole("link").length).toBeLessThanOrEqual(200);
    await act(async () => {});
    expect(onDiagnostic.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "markdown_limit_exceeded",
        classification: "recoverable",
        path: "$.body.elements[0].content",
      }),
    ]));
  });

  it("does not mutate deeply frozen input while applying bounded fallback", () => {
    const input = Object.freeze({
      schema: "2.0",
      body: Object.freeze({
        elements: Object.freeze([
          Object.freeze({ tag: "markdown", content: `prefix ${"x".repeat(25_000)}` }),
        ]),
      }),
    });
    const before = JSON.stringify(input);
    render(<CardRenderer card={input} />);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    ["syntax depth", `${"> ".repeat(20)}deep value`],
    ["node count", Array.from({ length: 600 }, (_, index) => `line ${index}`).join("\n\n")],
  ])("bounds %s independently and keeps sibling content", async (_case, content) => {
    const onDiagnostic = vi.fn();
    const { container } = render(
      <CardRenderer card={card(content, `sibling after ${_case}`)}
        onDiagnostic={onDiagnostic} />,
    );
    expect(within(container).getByRole("note", {
      name: "Markdown 内容已截断",
    })).toBeVisible();
    expect(within(container).getByText(`sibling after ${_case}`)).toBeVisible();
    await act(async () => {});
    expect(onDiagnostic.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "markdown_limit_exceeded" }),
    ]));
  });
});
