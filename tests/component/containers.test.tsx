import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import {
  completeContainerCard,
  defaultContainerCard,
  fiveLevelContainerCard,
  sixLevelContainerCard,
} from "../../src/fixtures/container-cards";

describe("container rendering", () => {
  it("recursively renders columns and form layout with stable protocol paths", () => {
    const { container } = render(<CardRenderer card={completeContainerCard} />);

    expect(screen.getByText("左栏")).toBeInTheDocument();
    expect(screen.getByText("右栏")).toBeInTheDocument();
    expect(screen.getByText("表单骨架").closest("form")).toHaveAttribute(
      "data-fcr-path",
      "$.body.elements[3]",
    );
    expect(container.querySelector('[data-fcr-depth="2"]')).toBeInTheDocument();
  });

  it("uses a local disclosure with stable controls for pointer and keyboard", () => {
    const { rerender } = render(<CardRenderer card={defaultContainerCard} />);
    const trigger = screen.getByRole("button", { name: "默认折叠" });
    const controls = trigger.getAttribute("aria-controls");

    expect(controls).toMatch(/^fcr-panel-/);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(controls!)).toHaveAttribute("hidden");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(controls!)).not.toHaveAttribute("hidden");

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(<CardRenderer card={defaultContainerCard} />);
    expect(screen.getByRole("button", { name: "默认折叠" }))
      .toHaveAttribute("aria-controls", controls);
  });

  it("lets an ordinary child button act before the parent container seam", () => {
    const card = {
      schema: "2.0",
      body: {
        elements: [{
          tag: "interactive_container",
          behaviors: [{ type: "callback" }],
          elements: [{
            tag: "collapsible_panel",
            header: {
              title: { tag: "plain_text", content: "子按钮" },
            },
            elements: [{
              tag: "div",
              text: { tag: "plain_text", content: "子内容" },
            }],
          }],
        }],
      },
    } as const;
    const { container } = render(<CardRenderer card={card} />);
    const parent = container.querySelector(
      '[data-fcr-path="$.body.elements[0]"]',
    )!;
    const escapedClicks = vi.fn();
    document.addEventListener("click", escapedClicks);

    fireEvent.click(screen.getByRole("button", { name: "子按钮" }));
    expect(screen.getByRole("button", { name: "子按钮" }))
      .toHaveAttribute("aria-expanded", "true");
    expect(escapedClicks).toHaveBeenCalledTimes(1);

    fireEvent.click(parent);
    expect(escapedClicks).toHaveBeenCalledTimes(1);
    document.removeEventListener("click", escapedClicks);
  });

  it("does not block or double-trigger a #7 image preview child", async () => {
    const card = {
      schema: "2.0",
      body: {
        elements: [{
          tag: "interactive_container",
          behaviors: [{ type: "callback" }],
          elements: [{
            tag: "img_combination",
            img_list: [
              { img_key: "one", alt: { tag: "plain_text", content: "一" } },
              { img_key: "two", alt: { tag: "plain_text", content: "二" } },
            ],
          }],
        }],
      },
    } as const;
    const escapedClicks = vi.fn();
    document.addEventListener("click", escapedClicks);
    const { container } = render(<CardRenderer card={card}
      resolveImage={(key) => `https://cdn.example.com/${key}.png`} />);

    await vi.waitFor(() => {
      expect(within(container).getAllByRole("img")).toHaveLength(2);
    });
    fireEvent.click(within(container).getByRole(
      "button", { name: "打开图片组预览" },
    ));

    expect(within(container).getByRole("dialog")).toBeInTheDocument();
    expect(escapedClicks).toHaveBeenCalledTimes(1);
    document.removeEventListener("click", escapedClicks);
  });

  it("falls back to stable paths for invalid and duplicate element ids", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "interactive_container",
          elements: [
            { tag: "div", element_id: "1invalid",
              text: { tag: "plain_text", content: "invalid" } },
            { tag: "div", element_id: "duplicate",
              text: { tag: "plain_text", content: "first" } },
            { tag: "div", element_id: "duplicate",
              text: { tag: "plain_text", content: "second" } },
          ],
        }],
      },
    }} />);

    expect(consoleError.mock.calls.flat().join(" "))
      .not.toContain("same key");
    consoleError.mockRestore();
  });

  it("replaces illegal nested nodes while preserving legal siblings", () => {
    const { container } = render(<CardRenderer
      card={{
        schema: "2.0",
        body: {
          elements: [
            {
              tag: "column_set",
              columns: [{
                tag: "column",
                elements: [
                  { tag: "div", text: { tag: "plain_text", content: "column legal" } },
                  { tag: "table", columns: [], rows: [] },
                ],
              }],
            },
            {
              tag: "interactive_container",
              elements: [
                { tag: "div", text: { tag: "plain_text", content: "interactive legal" } },
                { tag: "form", name: "nested", elements: [] },
              ],
            },
            {
              tag: "collapsible_panel",
              expanded: true,
              elements: [
                { tag: "div", text: { tag: "plain_text", content: "panel legal" } },
                { tag: "form", name: "nested_panel", elements: [] },
              ],
            },
            {
              tag: "form",
              name: "root_form",
              elements: [
                { tag: "div", text: { tag: "plain_text", content: "form legal" } },
                { tag: "chart", chart_spec: {} },
                {
                  tag: "button",
                  name: "submit",
                  form_action_type: "submit",
                  text: { tag: "plain_text", content: "提交" },
                },
              ],
            },
          ],
        },
      }} />);

    for (const text of [
      "column legal",
      "interactive legal",
      "panel legal",
      "form legal",
    ]) {
      expect(within(container).getByText(text)).toBeInTheDocument();
    }
    expect(within(container).getAllByRole("note")).toHaveLength(5);
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector(".fcr-chart-result")).toBeNull();
  });

  it("renders five levels and replaces the sixth with a stable placeholder", () => {
    const five = render(<CardRenderer card={fiveLevelContainerCard} />);
    expect(screen.getByText("叶子")).toBeInTheDocument();
    expect(five.container.querySelectorAll(".fcr-collapsible-panel"))
      .toHaveLength(5);
    five.unmount();

    const six = render(<CardRenderer card={sixLevelContainerCard} />);
    expect(six.container.querySelectorAll(".fcr-collapsible-panel"))
      .toHaveLength(5);
    expect(within(six.container).getByRole("note"))
      .toHaveTextContent("不支持的卡片组件");
  });
});
