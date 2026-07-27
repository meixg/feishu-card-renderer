import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

afterEach(cleanup);

describe("Base UI overlays", () => {
  it("confirms exactly once from the card portal without activating its parent container", () => {
    const onAction = vi.fn();
    const { container } = render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "interactive_container",
          behaviors: [{ type: "callback", value: { owner: "parent" } }],
          elements: [{
            tag: "button",
            text: { tag: "plain_text", content: "执行子操作" },
            confirm: {
              title: { tag: "plain_text", content: "确认执行" },
              text: { tag: "plain_text", content: "只执行一次？" },
            },
            behaviors: [{ type: "callback", value: { owner: "child" } }],
          }],
        }],
      },
    }} />);

    fireEvent.click(screen.getByRole("button", { name: "执行子操作" }));
    const dialog = screen.getByRole("alertdialog", { name: "确认执行" });

    expect(dialog.closest("[data-fcr-portal-host]")).toBe(
      container.querySelector("[data-fcr-portal-host]"),
    );

    const confirm = within(dialog).getByRole("button", { name: "确认" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "callback",
      value: { owner: "child" },
    }));
  });

  it("ignores confirm outside press without an action and returns focus after cancel", async () => {
    const onAction = vi.fn();
    const { container } = render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "button",
          text: { tag: "plain_text", content: "打开确认" },
          confirm: {
            title: { tag: "plain_text", content: "外部关闭确认" },
            text: { tag: "plain_text", content: "不会执行操作。" },
          },
          behaviors: [{ type: "callback", value: "unsafe-to-run" }],
        }],
      },
    }} />);
    const trigger = screen.getByRole("button", { name: "打开确认" });

    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("alertdialog", {
      name: "外部关闭确认",
    })).toBeInTheDocument();

    fireEvent.pointerDown(container);
    fireEvent.click(container);

    const dialog = screen.getByRole("alertdialog", {
      name: "外部关闭确认",
    });
    expect(dialog).toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("dismisses image preview outside the card flow and restores its trigger", async () => {
    const { container } = render(<CardRenderer
      resolveImage={(key) => `https://cdn.example.com/${key}.png`}
      card={{
        schema: "2.0",
        body: {
          elements: [{
            tag: "img_combination",
            img_list: [
              { img_key: "one", alt: { tag: "plain_text", content: "一" } },
              { img_key: "two", alt: { tag: "plain_text", content: "二" } },
            ],
          }],
        },
      }}
    />);
    await act(async () => {});
    const trigger = screen.getByRole("button", { name: "打开图片组预览" });

    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "一" });

    expect(dialog.closest("[data-fcr-portal-host]")).toBe(
      container.querySelector("[data-fcr-portal-host]"),
    );

    fireEvent.pointerDown(container);
    fireEvent.click(container);

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("portals overflow with disabled-aware roving focus and outside dismissal", async () => {
    const onAction = vi.fn();
    const { container } = render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "overflow",
          options: [
            {
              text: { tag: "plain_text", content: "第一项" },
              value: "first",
            },
            {
              text: { tag: "plain_text", content: "禁用项" },
              value: "disabled",
              disabled: true,
            },
            {
              text: { tag: "plain_text", content: "最后项" },
              value: "last",
            },
          ],
        }],
      },
    }} />);
    const trigger = screen.getByRole("button", { name: "更多操作" });

    trigger.focus();
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", { name: "更多操作" });

    expect(menu.closest("[data-fcr-portal-host]")).toBe(
      container.querySelector("[data-fcr-portal-host]"),
    );

    fireEvent.pointerDown(container);
    fireEvent.click(container);

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const first = await screen.findByRole("menuitem", { name: "第一项" });
    const disabled = screen.getByRole("menuitem", { name: "禁用项" });
    const last = screen.getByRole("menuitem", { name: "最后项" });
    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.keyDown(first, { key: "End" });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Home" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(disabled).toHaveFocus();
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(disabled);
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(disabled, { key: "ArrowDown" });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("hands overflow selection to confirm with cancel and exactly-once action semantics", async () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: {
        elements: [{
          tag: "interactive_container",
          behaviors: [{ type: "callback", value: { owner: "parent" } }],
          elements: [{
            tag: "overflow",
            confirm: {
              title: { tag: "plain_text", content: "确认菜单操作" },
              text: { tag: "plain_text", content: "继续执行？" },
            },
            options: [{
              text: { tag: "plain_text", content: "执行菜单项" },
              value: { owner: "child" },
              behaviors: [{
                type: "callback",
                value: { owner: "child" },
              }],
              multi_url: {
                url: "https://default.example/menu",
                pc_url: "https://pc.example/menu",
              },
            }],
          }],
        }],
      },
    }} />);
    const trigger = screen.getByRole("button", { name: "更多操作" });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "执行菜单项" }));

    expect(screen.queryByRole("menu")).toBeNull();
    let dialog = screen.getByRole("alertdialog", { name: "确认菜单操作" });
    fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));

    expect(onAction).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "执行菜单项" }));
    dialog = screen.getByRole("alertdialog", { name: "确认菜单操作" });
    fireEvent.click(within(dialog).getByRole("button", { name: "确认" }));

    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      expect.objectContaining({
        type: "callback",
        value: { owner: "child" },
      }),
      expect.objectContaining({
        type: "open_url",
        url: "https://pc.example/menu",
      }),
    ]);
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
