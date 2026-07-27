import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

function card(content: string, widthMode: "compact" | "default" = "compact") {
  return {
    schema: "2.0",
    config: { width_mode: widthMode },
    body: { elements: [{ tag: "markdown", content }] },
  };
}

describe("Markdown code and read-only tasks through CardRenderer", () => {
  it("renders inline, fenced, and indented code without losing source whitespace", () => {
    const content = [
      "Use `a_very_long_identifier_without_breaks` inline.",
      "",
      "```typescript",
      "const answer = 42;",
      "  console.log(answer);",
      "```",
      "",
      "    first",
      "      nested",
    ].join("\n");
    const { container } = render(<CardRenderer card={card(content)} />);

    const inline = within(container).getByText(
      "a_very_long_identifier_without_breaks",
    );
    expect(inline.tagName).toBe("CODE");
    const blocks = container.querySelectorAll("pre > code");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.textContent).toBe(
      "const answer = 42;\n  console.log(answer);",
    );
    expect(blocks[1]?.textContent).toBe("first\n  nested");
    expect(within(container).getByText("typescript")).toHaveAttribute(
      "aria-label",
      "代码语言：typescript",
    );
  });

  it("renders nested checked and unchecked tasks as immutable status", () => {
    const source = "- [ ] parent\n  - [x] nested complete\n- ordinary";
    const onAction = vi.fn();
    const input = card(source);
    const before = JSON.stringify(input);
    const { container } = render(
      <CardRenderer card={input} onAction={onAction} />,
    );

    expect(within(container).getByRole("img", {
      name: "未完成，只读任务",
    })).toBeVisible();
    expect(within(container).getByRole("img", {
      name: "已完成，只读任务",
    })).toBeVisible();
    expect(within(container).getByText("nested complete")).toBeVisible();
    expect(container.querySelectorAll("input,button")).toHaveLength(0);

    fireEvent.click(within(container).getByText("nested complete"));
    fireEvent.keyDown(within(container).getByText("nested complete"), {
      key: " ",
    });
    expect(onAction).not.toHaveBeenCalled();
    expect(JSON.stringify(input)).toBe(before);
  });
});
