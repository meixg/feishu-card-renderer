import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import {
  completeInteractiveCard,
  interactiveCoverageByTag,
  minimalInteractiveCards,
} from "../../src/fixtures/interactive-card";

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
      formValue: {
        note: "初始值", kind: "a", tags: ["x"], owner: "",
        members: ["ou_a"], date: "2026-07-27", time: "09:30",
        at: "2026-07-27T09:30", images: ["one"], agree: true,
      },
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

  it("opens overflow by keyboard and closes with Esc while restoring focus", async () => {
    render(<CardRenderer card={completeInteractiveCard} onAction={() => {}} />);
    const trigger = screen.getByRole("button", { name: "更多操作" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu");
    expect(menu).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus());
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

  it("treats an unchecked required checker as empty and submits exactly once after checking", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{ schema: "2.0", body: {
      elements: [{ tag: "form", name: "terms", elements: [
        { tag: "checker", name: "accepted", required: true, checked: false,
          text: { tag: "plain_text", content: "接受条款" } },
        { tag: "button", name: "submit", form_action_type: "submit",
          text: { tag: "plain_text", content: "提交条款" } },
      ] }],
    } }} />);
    fireEvent.click(screen.getByRole("button", { name: "提交条款" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("必填");
    fireEvent.click(screen.getByRole("checkbox", { name: "接受条款" }));
    fireEvent.click(screen.getByRole("button", { name: "提交条款" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      formValue: { accepted: true },
    }));
  });

  it.each([
    ["PC prohibition", "lark://msgcard/unsupported_action", "https://default.example", undefined],
    ["missing PC fallback", undefined, "https://default.example", "https://default.example/"],
    ["dangerous URL", "javascript:alert(1)", "https://default.example", undefined],
  ])("%s follows URL prohibition and fallback semantics", (
    _name, pcUrl, defaultUrl, expected,
  ) => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{ schema: "2.0", body: {
      elements: [{ tag: "button", text: { tag: "plain_text", content: "打开" },
        behaviors: [{ type: "open_url",
          ...(pcUrl !== undefined ? { pc_url: pcUrl } : {}),
          default_url: defaultUrl }] }],
    } }} />);
    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    const urls = onAction.mock.calls.map(([action]) => action)
      .filter(({ type }) => type === "open_url");
    expect(urls).toEqual(expected
      ? [expect.objectContaining({ url: expected })]
      : []);
  });

  it.each(["", "not a URL"])(
    "does not fallback when PC URL is explicitly present as %j",
    (pcUrl) => {
      const onAction = vi.fn();
      render(<CardRenderer onAction={onAction} card={{ schema: "2.0", body: {
        elements: [{ tag: "button",
          text: { tag: "plain_text", content: "显式 PC" },
          behaviors: [{ type: "open_url", pc_url: pcUrl,
            default_url: "https://default.example" }] }],
      } }} />);
      fireEvent.click(screen.getByRole("button", { name: "显式 PC" }));
      expect(onAction).not.toHaveBeenCalled();
    },
  );

  it("unregisters removed and renamed fields before submit and reset", () => {
    const onAction = vi.fn();
    const card = (fieldName: string, includeField = true) => ({
      schema: "2.0", body: { elements: [{ tag: "form", name: "lifecycle",
        elements: [
          ...(includeField ? [{ tag: "input", name: fieldName, required: true,
            default_value: `${fieldName}-initial`,
            label: { tag: "plain_text", content: fieldName } }] : []),
          { tag: "button", name: "reset", form_action_type: "reset",
            text: { tag: "plain_text", content: "生命周期重置" } },
          { tag: "button", name: "submit", form_action_type: "submit",
            text: { tag: "plain_text", content: "生命周期提交" } },
        ] }] },
    });
    const rendered = render(<CardRenderer card={card("old")} onAction={onAction} />);
    fireEvent.change(screen.getByLabelText("old"), { target: { value: "edited" } });
    rendered.rerender(<CardRenderer card={card("new")} onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "生命周期重置" }));
    expect(screen.getByLabelText("new")).toHaveValue("new-initial");
    fireEvent.click(screen.getByRole("button", { name: "生命周期提交" }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      formValue: { new: "new-initial" },
    }));
    rendered.rerender(<CardRenderer card={card("gone", false)} onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "生命周期提交" }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      formValue: {},
    }));
  });

  it("cleans field state when a field changes form ownership", () => {
    const onAction = vi.fn();
    const field = { tag: "input", name: "owned", default_value: "initial",
      label: { tag: "plain_text", content: "归属字段" } };
    const submit = { tag: "button", name: "submit", form_action_type: "submit",
      text: { tag: "plain_text", content: "归属提交" } };
    const rendered = render(<CardRenderer onAction={onAction}
      card={{ schema: "2.0", body: { elements: [
        { tag: "form", name: "owner", elements: [field, submit] },
      ] } }} />);
    fireEvent.change(screen.getByLabelText("归属字段"), {
      target: { value: "edited" },
    });
    rendered.rerender(<CardRenderer onAction={onAction}
      card={{ schema: "2.0", body: { elements: [
        field,
        { tag: "form", name: "owner", elements: [submit] },
      ] } }} />);
    fireEvent.click(screen.getByRole("button", { name: "归属提交" }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      formValue: {},
    }));
  });

  it("creates a fresh form scope when the form owner changes at the same path", () => {
    const onAction = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const card = (formName: string, initial: string, required: boolean) => ({
      schema: "2.0", body: { elements: [{ tag: "form", name: formName,
        elements: [
          { tag: "input", name: "shared", required, default_value: initial,
            label: { tag: "plain_text", content: `${formName} field` } },
          { tag: "button", name: "reset", form_action_type: "reset",
            text: { tag: "plain_text", content: `${formName} reset` } },
          { tag: "button", name: "submit", form_action_type: "submit",
            text: { tag: "plain_text", content: `${formName} submit` } },
        ] }] },
    });
    const rendered = render(<CardRenderer
      card={card("A", "old-initial", true)} onAction={onAction} />);
    fireEvent.change(screen.getByLabelText("A field"), {
      target: { value: "old-dirty" },
    });

    rendered.rerender(<CardRenderer
      card={card("B", "new-initial", false)} onAction={onAction} />);
    expect(screen.getByLabelText("B field")).toHaveValue("new-initial");
    fireEvent.change(screen.getByLabelText("B field"), {
      target: { value: "new-dirty" },
    });
    fireEvent.click(screen.getByRole("button", { name: "B reset" }));
    expect(screen.getByLabelText("B field")).toHaveValue("new-initial");
    fireEvent.click(screen.getByRole("button", { name: "B submit" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      formValue: { shared: "new-initial" },
    }));
    expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(
      /unmounted|while rendering|cannot update/i,
    );
    consoleError.mockRestore();
  });

  it("keeps formValue on exactly one callback when submit also opens URLs", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{ schema: "2.0", body: {
      elements: [{ tag: "form", name: "mixed", elements: [
        { tag: "input", name: "value", default_value: "x" },
        { tag: "button", name: "submit", form_action_type: "submit",
          text: { tag: "plain_text", content: "混合提交" },
          behaviors: [{ type: "callback" }, { type: "open_url",
            pc_url: "https://pc.example" }] },
      ] }],
    } }} />);
    fireEvent.click(screen.getByRole("button", { name: "混合提交" }));
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction.mock.calls.map(([action]) => action)
      .filter((action) => "formValue" in action)).toHaveLength(1);
  });

  it("renders disabled and hover tips as persistent accessible descriptions", () => {
    render(<CardRenderer onAction={() => {}} card={{ schema: "2.0", body: {
      elements: [{ tag: "button", disabled: true,
        text: { tag: "plain_text", content: "受限操作" },
        hover_tips: { tag: "plain_text", content: "悬停说明" },
        disabled_tips: { tag: "plain_text", content: "权限不足" } }],
    } }} />);
    const button = screen.getByRole("button", { name: "受限操作" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("悬停说明 权限不足");
    expect(screen.getByText("悬停说明")).toBeVisible();
    expect(screen.getByText("权限不足")).toBeVisible();
  });

  it("covers every interactive tag with legal minimal rendering and stable missing fields", () => {
    expect(minimalInteractiveCards.map(({ tag }) => tag)).toEqual([
      "input", "button", "overflow", "select_static", "multi_select_static",
      "select_person", "multi_select_person", "date_picker", "picker_time",
      "picker_datetime", "select_img", "checker",
    ]);
    expect(Object.keys(interactiveCoverageByTag)).toEqual(
      minimalInteractiveCards.map(({ tag }) => tag),
    );
    const submit = { tag: "button", name: "submit", form_action_type: "submit",
      text: { tag: "plain_text", content: "矩阵提交" } };
    const formOnly = new Set(["multi_select_static", "multi_select_person"]);
    const elements = minimalInteractiveCards.map((element, index) =>
      formOnly.has(element.tag)
        ? { tag: "form", name: `matrix_${index}`, elements: [
            { ...element, name: `field_${index}` }, submit,
          ] }
        : element);
    const { container } = render(<CardRenderer onAction={() => {}}
      card={{ schema: "2.0", body: { elements } }} />);
    expect(container.querySelectorAll(".fcr-unsupported")).toHaveLength(0);
    expect(container.querySelectorAll("input,textarea,select,button,fieldset").length)
      .toBeGreaterThanOrEqual(12);
  });

  it.each(minimalInteractiveCards.map((element) => [element.tag, element] as const))(
    "renders %s disabled without pointer activation",
    (tag, rawElement) => {
      const onAction = vi.fn();
      const element = { ...rawElement, disabled: true, name: `${tag}_field` };
      const formOnly = tag === "multi_select_static" ||
        tag === "multi_select_person";
      const cardElement = formOnly
        ? { tag: "form", name: `${tag}_form`, elements: [
            element,
            { tag: "button", name: "submit", form_action_type: "submit",
              text: { tag: "plain_text", content: `${tag} submit` } },
          ] }
        : element;
      const { container } = render(<CardRenderer onAction={onAction}
        card={{ schema: "2.0", body: { elements: [cardElement] } }} />);
      const disabled = container.querySelectorAll(":disabled");
      expect(disabled.length, `${tag} must expose native disabled semantics`)
        .toBeGreaterThan(0);
      disabled.forEach((control) => fireEvent.click(control));
      expect(onAction).not.toHaveBeenCalled();
    },
  );

  it.each(minimalInteractiveCards.map((element) => [element.tag, element] as const))(
    "keeps %s stable with malformed optional fields",
    (tag, rawElement) => {
      const element = { ...rawElement, name: `${tag}_invalid`,
        disabled: "not-boolean", required: "not-boolean",
        hover_tips: { tag: "plain_text", content: 42 },
        disabled_tips: { get content() { throw new Error("must not run"); } },
        behaviors: [{ type: "open_url", pc_url: "javascript:alert(1)" }] };
      const formOnly = tag === "multi_select_static" ||
        tag === "multi_select_person";
      const cardElement = formOnly
        ? { tag: "form", name: `${tag}_invalid_form`, elements: [
            element,
            { tag: "button", name: "submit", form_action_type: "submit",
              text: { tag: "plain_text", content: "非法矩阵提交" } },
          ] }
        : element;
      expect(() => render(<CardRenderer onAction={() => {}}
        card={{ schema: "2.0", body: { elements: [cardElement] } }} />))
        .not.toThrow();
    },
  );

  it("updates person, multi-select, time, datetime, image, and checker controls by keyboard-compatible native seams", () => {
    const onAction = vi.fn();
    render(<CardRenderer card={completeInteractiveCard} onAction={onAction} />);
    fireEvent.change(screen.getByLabelText("owner"), { target: { value: "ou_a" } });
    const members = screen.getByLabelText<HTMLSelectElement>("members");
    for (const option of members.options) option.selected = option.value === "ou_b";
    fireEvent.change(members);
    fireEvent.change(screen.getByLabelText("time"), { target: { value: "10:45" } });
    fireEvent.change(screen.getByLabelText("at"), {
      target: { value: "2026-07-28T11:00" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "图二" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "同意" }));
    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {
      name: "确认",
    }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      formValue: expect.objectContaining({
        owner: "ou_a", members: ["ou_b"], time: "10:45",
        at: "2026-07-28T11:00", images: ["one", "two"], agree: false,
      }),
    }));
  });
});
