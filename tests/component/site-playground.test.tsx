import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Playground } from "../../site/src/Playground";

afterEach(cleanup);

describe("project site playground", () => {
  it("renders the example and updates the preview from pasted JSON", () => {
    render(<Playground theme="light" device="pc" />);

    expect(screen.getByText("Playground 预览")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("飞书卡片 JSON 2.0"), {
      target: {
        value: JSON.stringify({
          schema: "2.0",
          body: {
            elements: [{
              tag: "div",
              text: { tag: "plain_text", content: "粘贴后的卡片" },
            }],
          },
        }),
      },
    });

    expect(screen.getByText("粘贴后的卡片")).toBeInTheDocument();
    expect(screen.getByText("无诊断")).toBeInTheDocument();
  });

  it("shows syntax errors without rendering stale content", () => {
    render(<Playground theme="dark" device="mobile" />);

    fireEvent.change(screen.getByLabelText("飞书卡片 JSON 2.0"), {
      target: { value: "{" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("JSON 语法错误");
    expect(screen.getByText("修正 JSON 后将在这里预览")).toBeInTheDocument();
    expect(screen.queryByText("Playground 预览")).not.toBeInTheDocument();
  });
});
