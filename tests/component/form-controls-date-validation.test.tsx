import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";
import {
  collapsibleInteractionCard,
  formControlsValidationCard,
  standaloneDateControlsCard,
} from "../../src/fixtures/form-controls-card";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function clear(control: HTMLElement): void {
  fireEvent.change(control, { target: { value: "" } });
}

describe("Issue #28 form controls, Field validation, and date interaction", () => {
  it("marks every missing required field, focuses and scrolls the first, clears corrected errors, and resets", async () => {
    const onAction = vi.fn();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(<CardRenderer
      card={formControlsValidationCard}
      onAction={onAction}
      resolveImage={async (key) => `https://cdn.example.com/${key}.png`}
    />);

    const title = screen.getByRole("textbox", { name: "标题" });
    const details = screen.getByRole("textbox", { name: "详情" });
    const terms = screen.getByRole("checkbox", { name: "同意条款" });
    const firstImage = screen.getByRole("checkbox", { name: "图片一" });
    const time = screen.getByLabelText("时间");
    const datetime = screen.getByLabelText("日期时间");
    clear(title);
    clear(details);
    fireEvent.click(terms);
    fireEvent.click(firstImage);
    clear(time);
    clear(datetime);

    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    const errors = screen.getAllByText("此项为必填项");
    expect(errors).toHaveLength(6);
    expect(title).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(title).toHaveAttribute("aria-invalid", "true");
    const describedBy = title.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedBy).toHaveLength(2);
    expect(document.getElementById(describedBy[0]!)!)
      .toHaveTextContent("用于显示在卡片顶部");
    expect(document.getElementById(describedBy[1]!)!)
      .toHaveTextContent("此项为必填项");
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.change(title, { target: { value: "已修正" } });
    expect(title).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText("此项为必填项")).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    expect(screen.queryByText("此项为必填项")).toBeNull();
    expect(title).toHaveValue("初始标题");
    expect(details).toHaveValue("初始详情");
    expect(terms).toBeChecked();
    expect(firstImage).toBeChecked();
    expect(time).toHaveValue("09:30");
    expect(datetime).toHaveValue("2026-07-28T09:30");

    fireEvent.click(screen.getByRole("button", { name: "提交" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "callback",
      source: expect.objectContaining({ tag: "button", name: "submit" }),
      formValue: {
        title: "初始标题",
        details: "初始详情",
        terms: true,
        images: ["one"],
        date: "2026-07-28",
        time: "09:30",
        datetime: "2026-07-28T09:30",
      },
    }));
  });

  it("keeps select_img checkbox and radio semantics across pointer and keyboard paths", () => {
    const onAction = vi.fn();
    render(<CardRenderer onAction={onAction} card={{
      schema: "2.0",
      body: {
        elements: [
          {
            tag: "select_img",
            name: "single-image",
            label: { tag: "plain_text", content: "单选图片" },
            selected_values: ["one"],
            options: [
              { text: { tag: "plain_text", content: "单图一" }, value: "one" },
              { text: { tag: "plain_text", content: "单图二" }, value: "two" },
            ],
          },
          {
            tag: "form",
            name: "multi-image-form",
            elements: [
              {
                tag: "select_img",
                name: "multi-image",
                label: { tag: "plain_text", content: "多选图片" },
                multi_select: true,
                selected_values: ["one"],
                options: [
                  { text: { tag: "plain_text", content: "多图一" }, value: "one" },
                  { text: { tag: "plain_text", content: "多图二" }, value: "two" },
                ],
              },
              {
                tag: "button",
                form_action_type: "submit",
                text: { tag: "plain_text", content: "提交图片" },
              },
            ],
          },
        ],
      },
    }} />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    radios[1]!.focus();
    fireEvent.keyDown(radios[1]!, { key: " " });
    fireEvent.click(radios[1]!);
    expect(radios[1]).toBeChecked();
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      value: "two",
    }));

    const multiTwo = screen.getByRole("checkbox", { name: "多图二" });
    fireEvent.click(multiTwo);
    expect(multiTwo).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "提交图片" }));
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      formValue: { "multi-image": ["one", "two"] },
    }));
  });

  it("uses a PC Popover calendar, closes with Escape, returns focus, and emits YYYY-MM-DD with IANA timezone", async () => {
    const onAction = vi.fn();
    const { container } = render(<CardRenderer
      card={standaloneDateControlsCard}
      device="pc"
      onAction={onAction}
    />);

    expect(container.querySelector("button button")).toBeNull();
    const trigger = screen.getByRole("button", { name: "预约日期：2026-07-28" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "选择预约日期" });
    const selected = within(dialog).getByRole("button", {
      name: "2026-07-28，已选择",
    });
    await waitFor(() => expect(selected).toHaveFocus());
    fireEvent.click(within(dialog).getByRole("button", { name: "2026-07-29" }));

    expect(dialog).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
      type: "callback",
      value: "2026-07-29",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "选择预约日期" }), {
      key: "Escape",
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "选择预约日期" })).toBeNull();
      expect(trigger).toHaveFocus();
    });
  });

  it("keeps mobile date and all time/datetime controls native, formatted, and timezone-aware", () => {
    const onAction = vi.fn();
    render(<CardRenderer
      card={standaloneDateControlsCard}
      device="mobile"
      onAction={onAction}
    />);

    const date = screen.getByLabelText("预约日期");
    const time = screen.getByLabelText("预约时间");
    const datetime = screen.getByLabelText("预约日期时间");
    expect(date).toHaveAttribute("type", "date");
    expect(time).toHaveAttribute("type", "time");
    expect(datetime).toHaveAttribute("type", "datetime-local");
    fireEvent.change(date, { target: { value: "2026-08-03" } });
    fireEvent.change(time, { target: { value: "10:45" } });
    fireEvent.change(datetime, { target: { value: "2026-08-03T10:45" } });

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(onAction.mock.calls.map(([action]) => ({
      value: action.value,
      timezone: action.timezone,
    }))).toEqual([
      { value: "2026-08-03", timezone },
      { value: "10:45", timezone },
      { value: "2026-08-03T10:45", timezone },
    ]);
  });

  it("uses Collapsible pointer and keyboard semantics with a stable relationship", () => {
    render(<CardRenderer card={collapsibleInteractionCard} />);
    const trigger = screen.getByRole("button", { name: "更多信息" });
    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeVisible();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(controls!)).toBeVisible();

    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(controls!)).not.toBeVisible();
  });
});
