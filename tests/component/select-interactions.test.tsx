import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

afterEach(cleanup);

const text = (content: string) => ({ tag: "plain_text", content });
const option = (content: string, value: unknown, disabled = false) => ({
  text: text(content),
  value,
  ...(disabled ? { disabled: true } : {}),
});

function activateOption(name: string) {
  const item = screen.getByRole("option", { name });
  fireEvent.pointerDown(item, { pointerType: "mouse" });
  fireEvent.click(item);
}

function openChoice(name: string) {
  fireEvent.click(
    screen.queryByRole("combobox", { name }) ??
      screen.getByRole("button", { name }),
  );
}

describe("Issue #77 PC Select and Combobox with mobile regression coverage", () => {
  it("uses Select below 8 options, Combobox at 8+, and Combobox for every multi-select", () => {
    render(<CardRenderer onAction={() => {}} card={{
      schema: "2.0",
      body: { elements: [
        { tag: "select_static", name: "small", label: text("Small"),
          options: Array.from({ length: 7 }, (_, index) =>
            option(`Small ${index}`, index)) },
        { tag: "select_static", name: "large", label: text("Large"),
          options: Array.from({ length: 8 }, (_, index) =>
            option(`Large ${index}`, index)) },
        { tag: "form", name: "multi-form", elements: [
          { tag: "multi_select_static", name: "multi", label: text("Multi"),
            options: [option("One", 1)] },
          { tag: "button", form_action_type: "submit", text: text("Submit") },
        ] },
      ] },
    }} />);

    expect(screen.getByRole("combobox", { name: "Small" }))
      .toHaveAttribute("data-choice-kind", "select");
    expect(screen.getByRole("combobox", { name: "Large" })
      .closest("[data-choice-kind]")).toHaveAttribute(
        "data-choice-kind",
        "combobox",
      );
    expect(screen.getByRole("combobox", { name: "搜索Multi" })
      .closest("[data-choice-kind]")).toHaveAttribute(
        "data-choice-kind",
        "combobox",
      );

    openChoice("Small");
    expect(screen.queryByRole("combobox", { name: "搜索Small" }))
      .not.toBeInTheDocument();
    activateOption("Small 0");

    openChoice("Large");
    expect(screen.getByRole("combobox", { name: "搜索Large" }))
      .toBeInTheDocument();
  });

  it("round-trips string, number, boolean, and object protocol values through opaque tokens", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: { elements: [{
        tag: "form",
        name: "values",
        elements: [
          { tag: "select_static", name: "string", label: text("String"),
            options: [option("String value", "raw")] },
          { tag: "select_static", name: "number", label: text("Number"),
            options: [option("Number value", 42)] },
          { tag: "select_static", name: "boolean", label: text("Boolean"),
            options: [option("Boolean value", false)] },
          { tag: "select_static", name: "object", label: text("Object"),
            options: [option("Object value", { nested: ["safe", 1] })] },
          { tag: "button", form_action_type: "submit", text: text("Submit values") },
        ],
      }] },
    }} />);

    for (const [label, value] of [
      ["String", "String value"],
      ["Number", "Number value"],
      ["Boolean", "Boolean value"],
      ["Object", "Object value"],
    ]) {
      openChoice(label);
      activateOption(value);
    }
    fireEvent.click(screen.getByRole("button", { name: "Submit values" }));

    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      formValue: {
        string: "raw",
        number: 42,
        boolean: false,
        object: { nested: ["safe", 1] },
      },
    }));
  });

  it("searches the complete option set, displays at most 100 matches, and emits no action", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: { elements: [{
        tag: "select_static",
        name: "large",
        label: text("Large search"),
        options: Array.from({ length: 151 }, (_, index) =>
          option(`Choice ${String(index).padStart(3, "0")}`, index)),
      }] },
    }} />);

    openChoice("Large search");
    expect(screen.getAllByRole("option")).toHaveLength(100);
    expect(screen.getByText(/显示前 100 项，共 151 项/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "搜索Large search" }), {
      target: { value: "Choice 150" },
    });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Choice 150" }))
      .toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("supports keyboard opening, navigation, selection, and focus return", async () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: { elements: [{
        tag: "select_static",
        name: "keyboard",
        label: text("Keyboard select"),
        options: [option("First", 1), option("Second", 2), option("Third", 3)],
      }] },
    }} />);
    const trigger = screen.getByRole("combobox", { name: "Keyboard select" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const first = await screen.findByRole("option", { name: "First" });
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.keyDown(first, { key: "End" });
    const third = screen.getByRole("option", { name: "Third" });
    expect(third).toHaveFocus();
    fireEvent.keyDown(third, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ value: 3 }));
  });

  it("keeps multi-select edits, removable chips, explicit Done, reset, and required form state", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: { elements: [{
        tag: "form",
        name: "multi",
        elements: [
          { tag: "multi_select_static", name: "tags", required: true,
            label: text("Tags"), selected_values: ["one"], options: [
              option("One", "one"), option("Two", "two"),
              option("Three", "three"), option("Four", "four"),
              option("Five", "five"),
            ] },
          { tag: "button", form_action_type: "reset", text: text("Reset tags") },
          { tag: "button", form_action_type: "submit", text: text("Submit tags") },
        ],
      }] },
    }} />);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "搜索Tags" }), {
      key: "ArrowDown",
    });
    activateOption("Two");
    activateOption("Three");
    activateOption("Four");
    activateOption("Five");
    expect(screen.getByText("+2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    expect(screen.getByRole("combobox", { name: "搜索Tags" }))
      .toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "移除 One" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit tags" }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      formValue: { tags: ["two", "three", "four", "five"] },
    }));

    fireEvent.click(screen.getByRole("button", { name: "Reset tags" }));
    expect(screen.getByRole("button", { name: "移除 One" }))
      .toBeInTheDocument();
  });

  it("uses a keyboard-safe mobile Drawer, auto-closes single select, and keeps multi edits on close", async () => {
    const onAction = vi.fn();
    render(<CardRenderer device="mobile" onAction={onAction} card={{
      schema: "2.0",
      body: { elements: [
        { tag: "select_static", name: "single", label: text("Mobile single"),
          options: [option("Alpha", { id: "a" }), option("Beta", { id: "b" })] },
        { tag: "select_static", name: "searchable",
          label: text("Mobile searchable"),
          options: Array.from({ length: 8 }, (_, index) =>
            option(`Searchable ${index}`, index)) },
        { tag: "form", name: "mobile-form", elements: [
          { tag: "multi_select_static", name: "multi", label: text("Mobile multi"),
            options: [option("One", 1), option("Two", 2)] },
          { tag: "button", form_action_type: "submit", text: text("Mobile submit") },
        ] },
      ] },
    }} />);

    openChoice("Mobile single，打开选项");
    const drawer = screen.getByRole("dialog", { name: "Mobile single" });
    await waitFor(() => expect(
      within(drawer).getByRole("button", { name: "关闭选择器" }),
    ).toHaveFocus());
    expect(within(drawer).queryByRole("combobox", {
      name: "搜索Mobile single",
    })).not.toBeInTheDocument();
    activateOption("Beta");
    expect(screen.queryByRole("dialog", { name: "Mobile single" })).toBeNull();
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      value: { id: "b" },
    }));

    openChoice("Mobile searchable，打开选项");
    const searchableDrawer = screen.getByRole("dialog", {
      name: "Mobile searchable",
    });
    await waitFor(() => expect(within(searchableDrawer).getByRole(
      "combobox",
      { name: "搜索Mobile searchable" },
    )).toHaveFocus());
    fireEvent.click(within(searchableDrawer).getByRole("button", {
      name: "关闭选择器",
    }));

    openChoice("Mobile multi，打开选项");
    activateOption("Two");
    expect(screen.getByRole("dialog", { name: "Mobile multi" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "完成" }))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭选择器" }));
    expect(screen.getByRole("button", { name: "移除 Two" }))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mobile submit" }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      formValue: { multi: [2] },
    }));

    fireEvent.click(screen.getByRole("button", { name: "移除 Two" }));
    openChoice("Mobile multi，打开选项");
    activateOption("One");
    activateOption("One");
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    fireEvent.click(screen.getByRole("button", { name: "Mobile submit" }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      formValue: { multi: [] },
    }));
  });

  it("searches supplied person options using resolved data without directory access", async () => {
    const resolvePerson = vi.fn(async (id: string) => ({
      id,
      name: id === "ou_a" ? "Ada Lovelace" : "Grace Hopper",
    }));
    render(<CardRenderer onAction={() => {}} resolvePerson={resolvePerson} card={{
      schema: "2.0",
      body: { elements: [{
        tag: "select_person",
        name: "person",
        label: text("Person"),
        options: [{ value: "ou_a" }, { value: "ou_b" }],
      }] },
    }} />);

    await waitFor(() => expect(resolvePerson).toHaveBeenCalledTimes(2));
    openChoice("Person");
    fireEvent.change(screen.getByRole("combobox", { name: "搜索Person" }), {
      target: { value: "Grace" },
    });
    expect(await screen.findByRole("option", { name: "Grace Hopper" }))
      .toBeInTheDocument();
    expect(resolvePerson.mock.calls.map(([id]) => id).sort())
      .toEqual(["ou_a", "ou_b"]);
  });

  it("exposes person loading and error states without leaking supplied IDs", async () => {
    let finishLoading: ((person: {
      id: string;
      name: string;
    }) => void) | undefined;
    const loading = new Promise<{ id: string; name: string }>((resolve) => {
      finishLoading = resolve;
    });
    const resolvePerson = vi.fn((id: string) =>
      id === "ou_loading"
        ? loading
        : Promise.reject(new Error("resolver unavailable")));
    const { container } = render(
      <CardRenderer
        card={{
          schema: "2.0",
          body: { elements: [{
            tag: "select_person",
            name: "person-status",
            label: text("Person status"),
            options: [{ value: "ou_loading" }, { value: "ou_error" }],
          }] },
        }}
        onAction={() => {}}
        resolvePerson={resolvePerson}
      />,
    );

    const status = await screen.findByRole("status", {
      name: "Person status人员解析状态",
    });
    await waitFor(() => {
      expect(status).toHaveTextContent("正在加载 1 个人员选项");
      expect(status).toHaveTextContent("1 个人员选项加载失败");
    });
    expect(container).not.toHaveTextContent(/ou_loading|ou_error/);

    openChoice("Person status");
    expect(screen.getByRole("option", { name: "人员信息加载中" }))
      .toBeInTheDocument();
    expect(screen.getByRole("option", { name: "人员信息不可用" }))
      .toBeInTheDocument();

    await act(async () => {
      finishLoading?.({ id: "ou_loading", name: "Ada Lovelace" });
      await loading;
    });
    expect(await screen.findByRole("option", { name: "Ada Lovelace" }))
      .toBeInTheDocument();
    expect(status).not.toHaveTextContent("正在加载");
    expect(status).toHaveTextContent("1 个人员选项加载失败");
    expect(resolvePerson.mock.calls.map(([id]) => id).sort())
      .toEqual(["ou_error", "ou_loading"]);
  });

  it("preserves disabled and confirm semantics without search actions", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: { elements: [
        { tag: "select_static", name: "disabled", label: text("Disabled"),
          disabled: true, options: [option("No", "no")] },
        { tag: "select_static", name: "confirm", label: text("Confirmed"),
          options: [option("Yes", true)], confirm: {
            title: text("Confirm choice"), text: text("Continue?"),
          } },
      ] },
    }} />);

    expect(screen.getByRole("combobox", { name: "Disabled" })).toBeDisabled();
    openChoice("Confirmed");
    activateOption("Yes");
    expect(onAction).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog", { name: "Confirm choice" });
    fireEvent.click(within(dialog).getByRole("button", { name: "确认" }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ value: true }));
  });

  it("localizes PC search, empty, person resource, and chip controls without actions", async () => {
    const onAction = vi.fn();
    render(
      <CardRenderer
        locale="en_US"
        onAction={onAction}
        resolvePerson={() => Promise.reject(new Error("unavailable"))}
        card={{
          schema: "2.0",
          body: { elements: [{
            tag: "form",
            name: "localized",
            elements: [
              {
                tag: "select_person",
                name: "person",
                label: text("People"),
                options: [{ value: "opaque-person-id" }],
              },
              {
                tag: "multi_select_static",
                name: "tags",
                label: text("Tags"),
                selected_values: ["one"],
                options: [
                  option("One", "one"),
                  option("Disabled", "disabled", true),
                ],
              },
              { tag: "button", form_action_type: "submit", text: text("Submit") },
            ],
          }] },
        }}
      />,
    );

    const status = await screen.findByRole("status", {
      name: "People person resolution status",
    });
    await waitFor(() => expect(status).toHaveTextContent(
      "1 person option failed to load",
    ));
    openChoice("People");
    fireEvent.change(screen.getByRole("combobox", { name: "Search People" }), {
      target: { value: "no match" },
    });
    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Search People" }), {
      key: "Escape",
    });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Search Tags" }), {
      key: "ArrowDown",
    });
    expect(screen.getByRole("option", { name: "Disabled" }))
      .toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("option", { name: "Disabled" }));
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove One" }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("server-renders and hydrates PC Select, single Combobox, and multiple Combobox", async () => {
    const card = {
      schema: "2.0",
      body: { elements: [
        { tag: "select_static", name: "small", label: text("SSR small"),
          options: [option("Small A", "a"), option("Small B", "b")] },
        { tag: "select_static", name: "large", label: text("SSR large"),
          options: Array.from({ length: 8 }, (_, index) =>
            option(`Large ${index}`, index)) },
        { tag: "form", name: "ssr-form", elements: [
          { tag: "multi_select_static", name: "multi", label: text("SSR multi"),
            options: [option("Multi A", "a"), option("Multi B", "b")] },
          { tag: "button", form_action_type: "submit", text: text("SSR submit") },
        ] },
      ] },
    };
    const onAction = vi.fn();
    const html = renderToString(<CardRenderer card={card} onAction={onAction} />);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const server = within(container);
    const portalHostBefore = container.querySelector("[data-fcr-portal-host]");
    const smallBefore = server.getByRole("combobox", { name: "SSR small" });
    const largeBefore = server.getByRole("combobox", { name: "SSR large" });
    const multiBefore = server.getByRole("combobox", { name: "搜索SSR multi" });
    expect(smallBefore).toHaveAttribute("aria-expanded", "false");
    expect(largeBefore).toHaveAttribute("aria-expanded", "false");
    expect(multiBefore).toHaveAttribute("aria-expanded", "false");
    expect(server.queryByRole("listbox")).not.toBeInTheDocument();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const root = hydrateRoot(container, <CardRenderer card={card} onAction={onAction} />);
    await act(async () => {});

    const hydrated = within(container);
    const small = hydrated.getByRole("combobox", { name: "SSR small" });
    const large = hydrated.getByRole("combobox", { name: "SSR large" });
    const multi = hydrated.getByRole("combobox", { name: "搜索SSR multi" });
    expect(small).toBe(smallBefore);
    expect(large).toBe(largeBefore);
    expect(multi).toBe(multiBefore);
    expect(container.querySelector("[data-fcr-portal-host]")).toBe(portalHostBefore);
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(
      /hydration|didn't match|server rendered/i,
    );

    small.focus();
    fireEvent.click(small);
    expect(small).toHaveAttribute("aria-expanded", "true");
    activateOption("Small B");
    expect(small).toHaveTextContent("Small B");
    expect(small).toHaveAttribute("aria-expanded", "false");
    expect(hydrated.queryByRole("listbox")).not.toBeInTheDocument();
    await waitFor(() => expect(small).toHaveFocus());

    large.focus();
    fireEvent.click(large);
    expect(large).toHaveAttribute("aria-expanded", "true");
    activateOption("Large 7");
    expect(large).toHaveTextContent("Large 7");
    expect(large).toHaveAttribute("aria-expanded", "false");
    expect(hydrated.queryByRole("combobox", { name: "搜索SSR large" }))
      .not.toBeInTheDocument();
    await waitFor(() => expect(large).toHaveFocus());

    multi.focus();
    fireEvent.keyDown(multi, { key: "ArrowDown" });
    expect(multi).toHaveAttribute("aria-expanded", "true");
    activateOption("Multi A");
    fireEvent.click(screen.getByRole("button", { name: "完成" }));
    expect(hydrated.getByRole("button", { name: "移除 Multi A" }))
      .toBeInTheDocument();
    expect(multi).toHaveAttribute("aria-expanded", "false");
    expect(hydrated.queryByRole("button", { name: "完成" }))
      .not.toBeInTheDocument();
    await waitFor(() => expect(multi).toHaveFocus());
    expect(container.querySelector("[data-fcr-portal-host]")).toBe(portalHostBefore);
    await act(async () => root.unmount());
    consoleError.mockRestore();
    container.remove();
  });

  it("server-renders and hydrates closed mobile Drawer controls without replacing nodes", async () => {
    const card = {
      schema: "2.0",
      body: { elements: [{
        tag: "select_static",
        name: "mobile",
        label: text("SSR mobile"),
        options: [option("First", { id: 1 }), option("Second", { id: 2 })],
      }] },
    };
    const onAction = vi.fn();
    const html = renderToString(
      <CardRenderer card={card} device="mobile" onAction={onAction} />,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const triggerBefore = within(container).getByRole("button", {
      name: "SSR mobile，打开选项",
    });
    const portalBefore = container.querySelector("[data-fcr-portal-host]");
    expect(triggerBefore).toHaveAttribute("aria-expanded", "false");
    expect(within(container).queryByRole("dialog")).not.toBeInTheDocument();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const root = hydrateRoot(
      container,
      <CardRenderer card={card} device="mobile" onAction={onAction} />,
    );
    await act(async () => {});

    const trigger = within(container).getByRole("button", {
      name: "SSR mobile，打开选项",
    });
    expect(trigger).toBe(triggerBefore);
    expect(container.querySelector("[data-fcr-portal-host]")).toBe(portalBefore);
    fireEvent.click(trigger);
    activateOption("Second");
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      value: { id: 2 },
    }));
    expect(within(container).queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(
      /hydration|didn't match|server rendered/i,
    );
    await act(async () => root.unmount());
    consoleError.mockRestore();
    container.remove();
  });
});
