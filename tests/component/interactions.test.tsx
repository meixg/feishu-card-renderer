import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import { completeInteractiveCard } from "../../src/fixtures/interactive-card";

afterEach(cleanup);

describe("interactive components and CardAction", () => {
  it("delays form fields, restores protocol initial values, validates required, and submits once", () => {
    const onAction = vi.fn();
    render(<CardRenderer card={completeInteractiveCard} onAction={onAction} />);
    const input = screen.getByLabelText("备注");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect(screen.getByRole("alert")).toHaveTextContent("必填");
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "修改后" } });
    fireEvent.change(screen.getByLabelText("类型"), { target: { value: "b" } });
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    expect(input).toHaveValue("初始值");
    expect(screen.getByLabelText("类型")).toHaveValue("a");

    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    const dialog = screen.getByRole("dialog", { name: "确认提交" });
    fireEvent.click(within(dialog).getByRole("button", { name: "确认" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0][0]).toMatchObject({
      type: "callback",
      source: { tag: "button", name: "submit" },
      value: { intent: "save" },
      formValue: { note: "初始值", kind: "a", tags: ["x"], agree: true },
    });
    expect(() => JSON.stringify(onAction.mock.calls[0][0])).not.toThrow();
  });

  it("dispatches immediate child behaviors without activating its parent and uses PC URL fallback", () => {
    const onAction = vi.fn();
    render(<CardRenderer card={completeInteractiveCard} onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "立即执行" }));
    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      expect.objectContaining({ type: "callback", value: { child: true } }),
      expect.objectContaining({ type: "open_url", url: "https://pc.example/" }),
    ]);
  });

  it("keeps local menu UI but disables business actions without onAction", () => {
    render(<CardRenderer card={completeInteractiveCard} />);
    expect(screen.getByRole("button", { name: "立即执行" })).toBeDisabled();
    const menu = screen.getByRole("button", { name: "更多操作" });
    expect(menu).not.toBeDisabled();
    fireEvent.click(menu);
    expect(screen.getByRole("menuitem", { name: "菜单项" })).toBeDisabled();
  });

  it("does not dispatch disabled controls and confirms with Esc focus restoration", async () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{ schema: "2.0", body: {
      elements: [{ tag: "button", text: { tag: "plain_text", content: "危险" },
        confirm: { title: { tag: "plain_text", content: "确认" },
          text: { tag: "plain_text", content: "继续？" } },
        behaviors: [{ type: "callback" }] },
        { tag: "button", disabled: true,
          text: { tag: "plain_text", content: "禁用" },
          behaviors: [{ type: "callback" }] }],
    } }} />);
    const trigger = screen.getByRole("button", { name: "危险" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "禁用" }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("adds the browser IANA timezone to date and time actions outside forms", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{ schema: "2.0", body: {
      elements: [{ tag: "date_picker", name: "when" }],
    } }} />);
    fireEvent.change(screen.getByLabelText("when"), {
      target: { value: "2026-07-27" },
    });
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "callback",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
  });
});
