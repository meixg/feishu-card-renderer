import { act, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import {
  completeMarkdownTableCard,
  oversizedMarkdownTableCard,
} from "../../src/fixtures/renderer-cards";

describe("responsive Markdown tables through CardRenderer", () => {
  it("preserves headers, rows, columns, alignment, and empty cells", () => {
    const { container } = render(<CardRenderer card={completeMarkdownTableCard} />);
    expect(within(container).getByText("团队排期")).toBeVisible();
    const table = within(container).getByRole("table");

    expect(table.querySelector("thead")).not.toBeNull();
    expect(table.querySelector("tbody")).not.toBeNull();
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getAllByRole("columnheader")).toHaveLength(5);
    expect(within(table).getByRole("columnheader", { name: "负责人" }))
      .toHaveAttribute("scope", "col");
    expect(within(table).getByRole("columnheader", { name: "状态" }))
      .toHaveStyle({ textAlign: "center" });
    expect(within(table).getByRole("columnheader", { name: "说明" }))
      .toHaveStyle({ textAlign: "right" });

    const rows = within(table).getAllByRole("row");
    expect(within(rows[2]!).getAllByRole("cell")).toHaveLength(5);
    expect(within(rows[2]!).getAllByRole("cell")[4]).toBeEmptyDOMElement();
    expect(container.querySelector(".fcr-markdown-table-wrap > table")).toBe(table);
  });

  it("keeps a safe table prefix and reports recoverable table bounds", async () => {
    const onDiagnostic = vi.fn();
    const { container } = render(
      <CardRenderer card={oversizedMarkdownTableCard}
        onDiagnostic={onDiagnostic} />,
    );

    const table = within(container).getByRole("table");
    expect(within(table).getAllByRole("columnheader").length)
      .toBeLessThanOrEqual(12);
    expect(within(table).getAllByRole("row").length).toBeLessThanOrEqual(51);
    expect(within(container).getByRole("note", {
      name: "Markdown 内容已截断",
    })).toBeVisible();
    await act(async () => {});
    expect(onDiagnostic.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "markdown_limit_exceeded",
        classification: "recoverable",
        path: "$.body.elements[0].content",
      }),
    ]));
  });
});
