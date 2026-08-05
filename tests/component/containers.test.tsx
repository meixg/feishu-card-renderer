import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { CardRenderer } from "../../src";
import {
  completeContainerCard,
  defaultContainerCard,
  fiveLevelContainerCard,
  sixLevelContainerCard,
} from "../../src/fixtures/container-cards";

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

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
    expect(trigger).toHaveClass("fcr-ui-button", "fcr-ui-button-ghost");
    expect(trigger).toHaveAccessibleName("默认折叠");
    expect(document.getElementById(controls!)).toHaveAttribute("hidden");
    expect(document.getElementById(controls!)).not.toBeVisible();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(controls!)).not.toHaveAttribute("hidden");

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(<CardRenderer card={defaultContainerCard} />);
    expect(screen.getByRole("button", { name: "默认折叠" }))
      .toHaveAttribute("aria-controls", controls);
  });

  it("does not render a collapsible header icon when icon is omitted", () => {
    render(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "collapsible_panel",
          header: {
            title: { tag: "plain_text", content: ">>" },
            icon_position: "right",
          },
          elements: [],
        }],
      },
    }} />);

    const trigger = screen.getByRole("button", { name: ">>" });

    expect(trigger.querySelector("svg")).not.toBeInTheDocument();
    expect(trigger).not.toHaveClass("fcr-icon-left", "fcr-icon-right");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("only draws a rounded collapsible border when border is configured", () => {
    const rendererCss = readFileSync("src/styles.css", "utf8");
    const { container, rerender } = render(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "collapsible_panel",
          header: {
            title: { tag: "plain_text", content: "无边框" },
          },
          elements: [],
        }],
      },
    }} />);
    const panel = container.querySelector(".fcr-collapsible-panel");

    expect(panel).not.toHaveClass("fcr-has-border");
    expect(panel).not.toHaveStyle({ borderRadius: "5px" });
    expect(rendererCss).not.toMatch(
      /\.fcr-collapsible-panel\s*\{[^}]*\bborder:/s,
    );

    rerender(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "collapsible_panel",
          header: {
            title: { tag: "plain_text", content: "默认圆角边框" },
          },
          border: { color: "grey" },
          elements: [],
        }],
      },
    }} />);

    expect(panel).toHaveClass("fcr-has-border");
    expect(panel).toHaveStyle({ borderRadius: "5px" });
    expect(rendererCss).toMatch(
      /\.fcr-collapsible-panel\.fcr-has-border\s*\{[^}]*\bborder:/s,
    );
  });

  it.each(["Enter", " "])("toggles the disclosure with %j", (key) => {
    render(<CardRenderer card={defaultContainerCard} />);
    const trigger = screen.getByRole("button", { name: "默认折叠" });

    fireEvent.keyDown(trigger, { key });
    fireEvent.click(trigger);
    fireEvent.keyUp(trigger, { key });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("hydrates a collapsed panel without replacing stable control nodes", async () => {
    const serverHtml = renderToString(
      <CardRenderer card={defaultContainerCard} colorScheme="dark" />,
    );
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);
    const serverTrigger = within(container).getByRole(
      "button",
      { name: "默认折叠" },
    );
    const serverControls = serverTrigger.getAttribute("aria-controls");
    const serverContent = container.querySelector(".fcr-collapsible-content");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: Root | undefined;

    await act(async () => {
      root = hydrateRoot(
        container,
        <CardRenderer card={defaultContainerCard} colorScheme="dark" />,
      );
    });

    expect(within(container).getByRole("button", { name: "默认折叠" }))
      .toBe(serverTrigger);
    expect(serverTrigger).toHaveAttribute("aria-controls", serverControls);
    expect(container.querySelector(".fcr-collapsible-content"))
      .toBe(serverContent);
    expect(container.querySelector(`#${serverControls}`)).toBe(serverContent);
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(
      /hydration|didn't match|server rendered/i,
    );

    await act(async () => root?.unmount());
    consoleError.mockRestore();
    container.remove();
  });

  it("uses unique disclosure control ids across card renderer instances", () => {
    const { container } = render(
      <>
        <CardRenderer card={defaultContainerCard} />
        <CardRenderer card={defaultContainerCard} />
      </>,
    );
    const triggers = within(container).getAllByRole(
      "button",
      { name: "默认折叠" },
    );
    const controls = triggers.map((trigger) =>
      trigger.getAttribute("aria-controls"));

    expect(new Set(controls).size).toBe(2);
    controls.forEach((id, index) => {
      const controlled = document.getElementById(id!);
      expect(controlled).not.toBeNull();
      fireEvent.click(triggers[index]);
      expect(controlled).not.toHaveAttribute("hidden");
      expect(container.querySelectorAll(`#${id}`)).toHaveLength(1);
    });
  });

  it("keeps an invalid collapsible header safe and keyboard accessible", () => {
    const { container } = render(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "collapsible_panel",
          header: {
            title: { tag: "plain_text", content: "安全折叠" },
            position: "sideways",
            icon_position: "left injected-class",
          },
          elements: [],
        }],
      },
    }} />);
    const trigger = screen.getByRole("button", { name: "安全折叠" });
    const controls = trigger.getAttribute("aria-controls");

    expect(trigger).not.toHaveClass("fcr-icon-left", "fcr-icon-right");
    expect(trigger).not.toHaveClass("injected-class");
    expect(controls).toMatch(/^fcr-panel-/);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(controls!)).not.toHaveAttribute("hidden");
    expect(container.querySelectorAll(`#${controls}`)).toHaveLength(1);
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
    const onAction = vi.fn();
    const { container } = render(
      <CardRenderer card={card} onAction={onAction} />,
    );
    const parent = container.querySelector(
      '[data-fcr-path="$.body.elements[0]"]',
    )!;
    const escapedClicks = vi.fn();
    document.addEventListener("click", escapedClicks);

    fireEvent.click(screen.getByRole("button", { name: "子按钮" }));
    expect(screen.getByRole("button", { name: "子按钮" }))
      .toHaveAttribute("aria-expanded", "true");
    expect(escapedClicks).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();

    const childTrigger = screen.getByRole("button", { name: "子按钮" });
    for (const key of ["Enter", " "]) {
      fireEvent.keyDown(childTrigger, { key });
      fireEvent.click(childTrigger);
      fireEvent.keyUp(childTrigger, { key });
      expect(onAction).not.toHaveBeenCalled();
    }
    expect(escapedClicks).toHaveBeenCalledTimes(3);

    fireEvent.click(parent);
    expect(escapedClicks).toHaveBeenCalledTimes(3);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "callback",
      source: expect.objectContaining({ tag: "interactive_container" }),
    }));
    document.removeEventListener("click", escapedClicks);
  });

  it("uses only the scoped focus ring seam for actionable containers", () => {
    const { container } = render(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "interactive_container",
          behaviors: [{ type: "callback" }],
          className: "injected-class",
          style: "color:red",
          elements: [{ tag: "div", text: {
            tag: "plain_text",
            content: "内容外观不变",
          } }],
        }],
      },
    }} onAction={() => {}} />);
    const interactive = screen.getByRole("button", { name: "交互容器" });

    expect(interactive).toHaveClass("fcr-interactive-container");
    expect(interactive).not.toHaveClass("injected-class");
    expect(interactive).not.toHaveAttribute("style", expect.stringContaining(
      "color",
    ));
    expect(container.querySelector(".fcr-ui-card")).toBeNull();
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

  it("counts ids on replaced illegal nodes before choosing React identity", () => {
    const card = (prefix: boolean) => ({
      schema: "2.0" as const,
      body: {
        elements: [
          ...(prefix ? [{ tag: "hr" as const }] : []),
          {
            tag: "collapsible_panel" as const,
            element_id: "dup",
            header: {
              title: { tag: "plain_text" as const, content: "身份面板" },
            },
            elements: [],
          },
          {
            tag: "interactive_container" as const,
            elements: [{
              tag: "form" as const,
              element_id: "dup",
              name: "illegal_form",
              elements: [],
            }],
          },
        ],
      },
    });
    const { rerender } = render(<CardRenderer card={card(false)} />);
    fireEvent.click(screen.getByRole("button", { name: "身份面板" }));
    expect(screen.getByRole("button", { name: "身份面板" }))
      .toHaveAttribute("aria-expanded", "true");

    rerender(<CardRenderer card={card(true)} />);
    expect(screen.getByRole("button", { name: "身份面板" }))
      .toHaveAttribute("aria-expanded", "false");
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
    // The four illegal children remain placeholders; the submit button is now
    // rendered by the Issue #4 interaction registry rather than a placeholder.
    expect(within(container).getAllByRole("note")).toHaveLength(4);
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
