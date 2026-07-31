import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import workspaceForm from "../fixtures/workspace-form.json";

afterEach(cleanup);

describe("parent-owned element-flow spacing", () => {
  it.each([
    ["positive", "4px 0px", "4px 0px", "4px"],
    ["negative", "-4px 0px", "-4px 0px", "-4px"],
    ["zero", "0px", "0px", "0px"],
  ])("keeps the default 8px gap and adds a %s element margin independently",
    (_name, margin, expected, blockOffset) => {
    const { container } = render(<CardRenderer card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "div",
          margin,
          text: { tag: "plain_text", content: "Offset" },
        }, { tag: "hr" }],
      },
    }} />);

    expect(container.querySelector(".fcr-body")).toHaveStyle({ gap: "8px" });
    expect(screen.getByText("Offset")).toHaveStyle({
      margin: expected,
      marginTop: blockOffset,
      marginBottom: blockOffset,
    });
  });

  const renderedFlowOwners = [
    ["body", ".fcr-body", (elements: object[]) => ({
      schema: "2.0", body: { elements },
    })],
    ["column", ".fcr-column", (elements: object[]) => ({
      schema: "2.0", body: { elements: [{
        tag: "column_set", columns: [{ tag: "column", elements }],
      }] },
    })],
    ["form", ".fcr-form", (elements: object[]) => ({
      schema: "2.0", body: { elements: [{ tag: "form", name: "flow", elements }] },
    })],
    ["interactive_container", ".fcr-interactive-container",
      (elements: object[]) => ({
        schema: "2.0", body: { elements: [{
          tag: "interactive_container", elements,
        }] },
      })],
    ["collapsible_panel", ".fcr-collapsible-content",
      (elements: object[]) => ({
        schema: "2.0", body: { elements: [{
          tag: "collapsible_panel", expanded: true, elements,
        }] },
      })],
  ] as const;

  it.each(renderedFlowOwners)(
    "renders empty and single-child $0 flows without edge spacing",
    (_owner, selector, card) => {
      for (const elements of [[], [{ tag: "hr" }]]) {
        const { container, unmount } = render(<CardRenderer card={card(elements)} />);
        const flow = container.querySelector(selector)!;

        expect(flow).toHaveStyle({ gap: "8px" });
        expect(flow.children).toHaveLength(elements.length);
        if (flow.firstElementChild && flow.lastElementChild) {
          expect(flow.firstElementChild).not.toHaveStyle({ marginTop: "8px" });
          expect(flow.lastElementChild).not.toHaveStyle({ marginBottom: "8px" });
        }
        unmount();
      }
    },
  );

  it("renders independent default gaps for every nested vertical flow", () => {
    const { container } = render(<CardRenderer card={{
      schema: "2.0",
      body: { elements: [{
        tag: "column_set",
        columns: [{ tag: "column", elements: [{ tag: "hr" }, { tag: "hr" }] }],
      }, {
        tag: "interactive_container",
        elements: [{ tag: "hr" }, { tag: "future_widget" }],
      }, {
        tag: "collapsible_panel",
        expanded: true,
        header: { title: { tag: "plain_text", content: "Details" } },
        elements: [{ tag: "hr" }, { tag: "hr" }],
      }] },
    }} />);

    expect(container.querySelector(".fcr-body")).toHaveStyle({ gap: "8px" });
    expect(container.querySelector(".fcr-column")).toHaveStyle({ gap: "8px" });
    expect(container.querySelector(".fcr-interactive-container"))
      .toHaveStyle({ gap: "8px" });
    expect(container.querySelector(".fcr-collapsible-content"))
      .toHaveStyle({ gap: "8px" });
    expect(container.querySelectorAll(".fcr-unsupported")).toHaveLength(1);
    expect(container.querySelector(".fcr-column")?.children).toHaveLength(2);
  });

  it.each([
    ["column", {
      tag: "column_set", horizontal_spacing: "17px", columns: [{
        tag: "column", direction: "horizontal", horizontal_spacing: "11px",
        elements: [{ tag: "hr" }, { tag: "hr" }],
      }],
    }, ".fcr-column", "11px"],
    ["interactive_container", {
      tag: "interactive_container", direction: "horizontal",
      horizontal_spacing: "13px", elements: [{ tag: "hr" }, { tag: "hr" }],
    }, ".fcr-interactive-container", "13px"],
  ])("uses only horizontal spacing for a horizontal %s",
    (_name, element, selector, gap) => {
      const { container } = render(<CardRenderer card={{
        schema: "2.0", body: { vertical_spacing: "0px", elements: [element] },
      }} />);

      expect(container.querySelector(selector)).toHaveStyle({
        flexDirection: "row", gap,
      });
    });

  it("keeps column_set columns governed only by horizontal spacing", () => {
    const { container } = render(<CardRenderer card={{
      schema: "2.0",
      body: { vertical_spacing: "0px", elements: [{
        tag: "column_set", horizontal_spacing: "17px", columns: [
          { tag: "column", elements: [{ tag: "hr" }] },
          { tag: "column", elements: [{ tag: "hr" }] },
        ],
      }] },
    }} />);

    const columnSet = container.querySelector(".fcr-column-set");
    expect(columnSet).toHaveStyle({ gap: "17px" });
    expect(columnSet?.children).toHaveLength(2);
  });

  it("keeps the shared Workspace form spaced, immutable, and interactive", () => {
    const input = structuredClone(workspaceForm);
    const onAction = vi.fn();
    const { container } = render(<CardRenderer card={input} onAction={onAction} />);
    const body = container.querySelector(".fcr-body")!;
    const form = container.querySelector(".fcr-form")!;

    expect(body).toHaveStyle({ gap: "8px" });
    expect(form).toHaveStyle({ gap: "8px" });
    expect(body.children).toHaveLength(2);
    expect(form.children).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Submit fixture" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(form).toHaveStyle({ gap: "8px" });

    fireEvent.change(screen.getByRole("textbox", { name: "Fixture note" }), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Fixture choice" }));
    const option = screen.getByRole("option", { name: "Option A" });
    fireEvent.pointerDown(option, { pointerType: "mouse" });
    fireEvent.click(option);
    fireEvent.click(screen.getByRole("button", { name: "Submit fixture" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "callback",
      value: workspaceForm.body.elements[1]!.elements![2]!.behaviors![0]!.value,
      formValue: { note: "hello", choice: "a" },
    }));
    expect(input).toEqual(workspaceForm);
  });
});
