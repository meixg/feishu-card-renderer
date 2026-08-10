import { act, fireEvent, render, within } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

function card(rows: string[], pageSize = 2) {
  return {
    schema: "2.0",
    body: {
      elements: [{
        tag: "table",
        page_size: pageSize,
        columns: [{ name: "value", display_name: "Value" }],
        rows: rows.map((value) => ({ value })),
      }],
    },
  };
}

describe("table pagination through CardRenderer", () => {
  it.each([
    ["empty", []],
    ["one page", ["one", "two"]],
  ])("does not render pagination for %s data", (_name, rows) => {
    const { container } = render(<CardRenderer card={card(rows)} />);
    expect(within(container).queryByRole("navigation", {
      name: "表格分页",
    })).toBeNull();
  });

  it("switches first, middle, and last pages with correct state and row order", () => {
    const { container } = render(
      <CardRenderer card={card(["one", "two", "three", "four", "five"])} />,
    );
    const navigation = within(container).getByRole("navigation", {
      name: "表格分页",
    });
    const previous = within(navigation).getByRole("button", { name: "上一页" });
    const next = within(navigation).getByRole("button", { name: "下一页" });
    const current = () => within(navigation).getByRole("button", {
      current: "page",
    });

    expect(previous).toBeDisabled();
    expect(within(navigation).getAllByRole("button").map((button) =>
      button.textContent)).toEqual(["上一页", "1", "2", "3", "下一页"]);
    expect(current()).toHaveAccessibleName("第 1 页");
    expect(within(container).getAllByRole("cell").map((cell) => cell.textContent))
      .toEqual(["one", "two"]);

    fireEvent.click(within(navigation).getByRole("button", { name: "第 2 页" }));
    expect(previous).toBeEnabled();
    expect(next).toBeEnabled();
    expect(current()).toHaveAccessibleName("第 2 页");
    expect(within(container).getAllByRole("cell").map((cell) => cell.textContent))
      .toEqual(["three", "four"]);

    fireEvent.click(next);
    expect(next).toBeDisabled();
    expect(current()).toHaveAccessibleName("第 3 页");
    expect(within(container).getAllByRole("cell").map((cell) => cell.textContent))
      .toEqual(["five"]);

    previous.focus();
    fireEvent.click(previous);
    expect(current()).toHaveAccessibleName("第 2 页");
  });

  it("uses shadcn page links and ellipses for large page sets", () => {
    const rows = Array.from({ length: 10 }, (_, index) => String(index + 1));
    const { container } = render(<CardRenderer card={card(rows, 1)} />);
    const navigation = within(container).getByRole("navigation", {
      name: "表格分页",
    });
    const pageNames = () => within(navigation).getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.startsWith("第 "))
      .map((button) => button.getAttribute("aria-label"));

    expect(pageNames()).toEqual([
      "第 1 页", "第 2 页", "第 3 页", "第 4 页", "第 5 页", "第 10 页",
    ]);
    expect(navigation.querySelectorAll('[data-slot="pagination-ellipsis"]'))
      .toHaveLength(1);

    fireEvent.click(within(navigation).getByRole("button", { name: "第 5 页" }));
    expect(pageNames()).toEqual(["第 1 页", "第 4 页", "第 5 页", "第 6 页", "第 10 页"]);
    expect(navigation.querySelectorAll('[data-slot="pagination-ellipsis"]'))
      .toHaveLength(2);
    expect(within(container).getByRole("cell")).toHaveTextContent("5");
  });

  it("localizes accessible names and disabled controls perform zero transitions", () => {
    const { container } = render(
      <CardRenderer locale="en_US" card={card(["one", "two", "three"])} />,
    );
    const navigation = within(container).getByRole("navigation", {
      name: "Table pagination",
    });
    const previous = within(navigation).getByRole("button", {
      name: "Previous page",
    });
    expect(within(navigation).getByRole("button", { current: "page" }))
      .toHaveAccessibleName("Page 1");
    fireEvent.click(previous);
    expect(within(container).getAllByRole("cell").map((cell) => cell.textContent))
      .toEqual(["one", "two"]);
  });

  it("hydrates without replacing pagination nodes or losing focused state", async () => {
    const renderer = <CardRenderer card={card(["one", "two", "three"])} />;
    const serverHtml = renderToString(renderer);
    const host = document.createElement("div");
    host.innerHTML = serverHtml;
    document.body.append(host);
    const previous = within(host).getByRole("button", { name: "上一页" });
    previous.focus();
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(host, renderer);
    });
    expect(within(host).getByRole("button", { name: "上一页" })).toBe(previous);
    expect(previous).toHaveFocus();
    await act(async () => root?.unmount());
    host.remove();
  });

  it("preserves semantic table structure and never emits pagination actions", () => {
    const onAction = vi.fn();
    const { container } = render(
      <CardRenderer card={card(["one", "two", "three"])} onAction={onAction} />,
    );
    const table = within(container).getByRole("table");
    expect(table.querySelector("thead")).not.toBeNull();
    expect(table.querySelector("tbody")).not.toBeNull();
    expect(table.querySelectorAll("tr")).toHaveLength(3);
    expect(table.querySelectorAll("th")).toHaveLength(1);
    expect(table.querySelectorAll("td")).toHaveLength(2);
    fireEvent.click(within(container).getByRole("button", { name: "下一页" }));
    expect(onAction).not.toHaveBeenCalled();
  });
});
