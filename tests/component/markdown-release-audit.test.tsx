import { act, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer, normalizeCard, validateCard } from "../../src";
import {
  adversarialMarkdownFixtures,
  markdownReleaseFixtures,
} from "../../src/fixtures/renderer-cards";

describe("Markdown release fixtures through public seams", () => {
  it("keeps minimal, complete, defaults, invalid, and unknown fixtures independent", async () => {
    expect(validateCard(markdownReleaseFixtures.minimal).diagnostics).toEqual([]);
    expect(validateCard(markdownReleaseFixtures.complete).diagnostics).toEqual([]);

    const defaults = normalizeCard(markdownReleaseFixtures.defaults);
    expect(defaults.card?.body?.elements[0]).toMatchObject({
      tag: "markdown",
      text_size: "normal",
      text_align: "left",
    });

    const invalid = validateCard(markdownReleaseFixtures.invalid);
    expect(invalid.diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["invalid_structure", "invalid_enum", "invalid_style"]),
    );

    const unknown = normalizeCard(markdownReleaseFixtures.unknown);
    expect(unknown.card?.body?.elements[0]).toHaveProperty(
      "future_markdown_option",
      { preserved: true },
    );

    const onDiagnostic = vi.fn();
    const { container } = render(
      <CardRenderer card={markdownReleaseFixtures.complete}
        onDiagnostic={onDiagnostic} />,
    );
    expect(within(container).getByRole("heading", {
      level: 1,
      name: "发布验收标题",
    })).toBeVisible();
    expect(container.querySelector("em")).toHaveTextContent("强调");
    expect(container.querySelector("strong")).toHaveTextContent("粗体");
    expect(container.querySelector("del")).toHaveTextContent("删除线");
    expect(container.querySelector(
      'strong > [data-fcr-font-color="grey"]',
    )).toHaveTextContent("协议颜色扩展");
    expect(within(container).getByRole("link", { name: "安全链接" }))
      .toHaveAttribute("rel", "noopener noreferrer");
    expect(container.querySelector("ul ol")).not.toBeNull();
    expect(container.querySelector("blockquote")).toHaveTextContent("引用内容");
    expect(container.querySelector(".fcr-markdown-content > hr")).not.toBeNull();
    expect(container.querySelectorAll("pre > code")).toHaveLength(2);
    expect(within(container).getByRole("table")).toBeVisible();
    expect(within(container).getByRole("img", {
      name: "未完成，只读任务",
    })).toBeVisible();
    expect(container.querySelector(".fcr-markdown")).toHaveStyle({
      textAlign: "center",
      margin: "4px 0px",
    });
    await act(async () => {});
    expect(onDiagnostic).toHaveBeenCalledWith([]);
  });

  it.each([
    ["long input", adversarialMarkdownFixtures.longInput],
    ["deep nesting", adversarialMarkdownFixtures.deepNesting],
    ["large table", adversarialMarkdownFixtures.largeTable],
    ["pathological delimiters", adversarialMarkdownFixtures.pathologicalDelimiters],
    ["many links", adversarialMarkdownFixtures.manyLinks],
  ])("bounds %s without failing the card", async (_name, fixture) => {
    const onDiagnostic = vi.fn();
    const { container } = render(
      <CardRenderer card={fixture} onDiagnostic={onDiagnostic} />,
    );
    expect(container.querySelector(".fcr-root")).not.toBeNull();
    if (_name !== "large table") {
      expect(within(container).getByText("safe sibling")).toBeVisible();
    }
    await act(async () => {});
    if (_name !== "pathological delimiters") {
      expect(onDiagnostic.mock.calls[0]?.[0]).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "markdown_limit_exceeded",
          classification: "recoverable",
        }),
      ]));
    }
  });

  it("keeps dangerous URLs, raw HTML, extensions, and remote images inert and visible", async () => {
    const onDiagnostic = vi.fn();
    const input = adversarialMarkdownFixtures.hostileContent;
    const before = JSON.stringify(input);
    const { container } = render(
      <CardRenderer card={input} onDiagnostic={onDiagnostic} />,
    );

    expect(container.querySelector("script, future-tag, img")).toBeNull();
    expect(within(container).queryByRole("link", { name: "danger" })).toBeNull();
    expect(within(container).getByText(/<script src=/)).toBeVisible();
    expect(within(container).getByText(
      "<future-tag>visible extension source</future-tag>",
    )).toBeVisible();
    expect(within(container).getByText("remote image")).toBeVisible();
    expect(JSON.stringify(input)).toBe(before);

    await act(async () => {});
    expect(onDiagnostic.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unsafe_url" }),
      expect.objectContaining({ code: "markdown_unsupported_markup" }),
      expect.objectContaining({ code: "markdown_image_blocked" }),
    ]));
  });
});
