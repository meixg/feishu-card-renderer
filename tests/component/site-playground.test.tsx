import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Playground } from "../../site/src/Playground";

afterEach(cleanup);

describe("project site playground", () => {
  it("renders the example and updates the preview from pasted JSON", async () => {
    const user = userEvent.setup();
    const { container } = render(<Playground theme="light" device="pc" />);

    expect(screen.getByText("Playground 预览")).toBeInTheDocument();
    expect(container.querySelector(".playground-editor .cm-editor"))
      .toBeInTheDocument();
    expect(container.querySelectorAll(".playground-editor .tok-propertyName"))
      .not.toHaveLength(0);
    const editor = screen.getByRole("textbox", { name: "飞书卡片 JSON 2.0" });
    await user.click(editor);
    await user.keyboard("{Control>}a{/Control}{Backspace}");
    await user.paste(JSON.stringify({
      schema: "2.0",
      body: {
        elements: [{
          tag: "div",
          text: { tag: "plain_text", content: "粘贴后的卡片" },
        }],
      },
    }));

    expect(screen.getByText("粘贴后的卡片")).toBeInTheDocument();
    expect(screen.getByText("无诊断")).toBeInTheDocument();
  });

  it("shows syntax errors without rendering stale content", async () => {
    const user = userEvent.setup();
    render(<Playground theme="dark" device="mobile" />);

    const editor = screen.getByRole("textbox", { name: "飞书卡片 JSON 2.0" });
    await user.click(editor);
    await user.keyboard("{Control>}a{/Control}{Backspace}");
    await user.paste("{");

    expect(screen.getByRole("alert")).toHaveTextContent("JSON 语法错误");
    expect(screen.getByText("修正 JSON 后将在这里预览")).toBeInTheDocument();
    expect(screen.queryByText("Playground 预览")).not.toBeInTheDocument();
  });
});
