import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
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

describe("Issue #80 base-nova date Popover and Calendar", () => {
  it("keeps field IDs and label, description, and error references inside each card", () => {
    const card = {
      schema: "2.0",
      body: {
        elements: [{
          tag: "form",
          name: "duplicate-structure",
          elements: [
            {
              tag: "input",
              name: "title",
              label: { tag: "plain_text", content: "标题" },
              hover_tips: { tag: "plain_text", content: "标题说明" },
              required: true,
            },
            {
              tag: "select_img",
              name: "image",
              label: { tag: "plain_text", content: "图片" },
              hover_tips: { tag: "plain_text", content: "图片说明" },
              multi_select: true,
              options: [{
                text: { tag: "plain_text", content: "图片一" },
                value: "one",
              }],
              required: true,
            },
            {
              tag: "date_picker",
              name: "date",
              label: { tag: "plain_text", content: "日期" },
              hover_tips: { tag: "plain_text", content: "日期说明" },
              required: true,
            },
            {
              tag: "button",
              form_action_type: "submit",
              text: { tag: "plain_text", content: "提交" },
            },
          ],
        }],
      },
    } as const;
    const { container } = render(<>
      <CardRenderer card={card} onAction={() => {}} />
      <CardRenderer card={card} onAction={() => {}} />
    </>);
    const cards = [...container.querySelectorAll<HTMLElement>("article")];
    expect(cards).toHaveLength(2);

    for (const renderedCard of cards) {
      fireEvent.click(within(renderedCard).getByRole("button", {
        name: "提交",
      }));
      for (const label of renderedCard.querySelectorAll<HTMLLabelElement>(
        "label[for]",
      )) {
        expect(renderedCard.querySelector(`[id="${label.htmlFor}"]`))
          .not.toBeNull();
      }
      const describedIds = new Set<string>();
      for (const control of renderedCard.querySelectorAll<HTMLElement>(
        "[aria-describedby]",
      )) {
        for (const id of control.getAttribute("aria-describedby")!.split(" ")) {
          describedIds.add(id);
          expect(renderedCard.querySelector(`[id="${id}"]`)).not.toBeNull();
        }
      }
      for (const control of renderedCard.querySelectorAll<HTMLElement>(
        "[aria-labelledby]",
      )) {
        for (const id of control.getAttribute("aria-labelledby")!.split(" ")) {
          expect(renderedCard.querySelector(`[id="${id}"]`)).not.toBeNull();
        }
      }
      for (const error of within(renderedCard).getAllByRole("alert")) {
        expect(error.id).not.toBe("");
        expect(describedIds).toContain(error.id);
      }
    }

    const ids = [...container.querySelectorAll<HTMLElement>("[id]")]
      .map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

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
    const trigger = screen.getByRole("combobox", {
      name: "预约日期：2026-07-28",
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "选择预约日期" });
    expect(dialog.closest("[data-fcr-portal-host]")).not.toBeNull();
    const previousMonth = within(dialog).getByRole("button", {
      name: "转到上个月",
    });
    const nextMonth = within(dialog).getByRole("button", {
      name: "转到下个月",
    });
    expect(previousMonth).toBeEnabled();
    expect(nextMonth).toBeEnabled();
    fireEvent.click(previousMonth);
    expect(within(dialog).getByRole("grid", { name: "2026年6月" }))
      .toBeInTheDocument();
    fireEvent.click(nextMonth);
    expect(within(dialog).getByRole("grid", { name: "2026年7月" }))
      .toBeInTheDocument();
    expect(trigger).toHaveAccessibleName("预约日期：2026-07-28");
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

  it("server-renders and hydrates a closed PC date Popover without replacing its portal host", async () => {
    const card = {
      schema: "2.0",
      body: {
        elements: [
          {
            tag: "date_picker",
            name: "hydrated-date",
            label: { tag: "plain_text", content: "Hydrated date" },
            initial_date: "2026-07-28",
          },
          {
            tag: "date_picker",
            name: "required-date",
            label: { tag: "plain_text", content: "Required date" },
            required: true,
          },
          {
            tag: "date_picker",
            name: "disabled-date",
            label: { tag: "plain_text", content: "Disabled date" },
            disabled: true,
          },
        ],
      },
    } as const;
    const onAction = vi.fn();
    const renderer = <CardRenderer
      card={card}
      device="pc"
      locale="en_us"
      onAction={onAction}
    />;
    const firstMarkup = renderToString(renderer);
    const secondMarkup = renderToString(renderer);
    expect(secondMarkup).toBe(firstMarkup);
    expect(firstMarkup).not.toContain("data-slot=\"popover-content\"");

    const container = document.createElement("div");
    container.innerHTML = firstMarkup;
    document.body.append(container);
    const serverHost = container.querySelector("[data-fcr-portal-host]");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, renderer);
      });

      expect(container.querySelector("[data-fcr-portal-host]")).toBe(serverHost);
      expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(
        /hydration|didn't match|server rendered/i,
      );
      const ordinary = within(container).getByRole("combobox", {
        name: "Hydrated date: 2026-07-28",
      });
      expect(within(container).getByRole("combobox", {
        name: "Required date: Choose date",
      })).toHaveAttribute("aria-required", "true");
      expect(within(container).getByRole("combobox", {
        name: "Disabled date: Choose date",
      })).toBeDisabled();

      fireEvent.click(ordinary);
      const dialog = within(container).getByRole("dialog", {
        name: "Choose Hydrated date",
      });
      expect(dialog.closest("[data-fcr-portal-host]")).toBe(serverHost);
      fireEvent.click(within(dialog).getByRole("button", {
        name: "2026-07-29",
      }));
      await waitFor(() => expect(ordinary).toHaveFocus());
      expect(onAction).toHaveBeenLastCalledWith(expect.objectContaining({
        value: "2026-07-29",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));

      fireEvent.click(ordinary);
      fireEvent.keyDown(within(container).getByRole("dialog", {
        name: "Choose Hydrated date",
      }), { key: "Escape" });
      await waitFor(() => {
        expect(within(container).queryByRole("dialog", {
          name: "Choose Hydrated date",
        })).toBeNull();
        expect(ordinary).toHaveFocus();
      });
    } finally {
      await act(async () => root?.unmount());
      consoleError.mockRestore();
      container.remove();
    }
  });

  it("localizes the PC date trigger, dialog, grid, and navigation labels", () => {
    render(<CardRenderer
      card={standaloneDateControlsCard}
      device="pc"
      locale="en_us"
      onAction={() => {}}
    />);

    const trigger = screen.getByRole("combobox", {
      name: "预约日期: 2026-07-28",
    });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Choose 预约日期" }))
      .toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "July 2026" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to the Previous Month" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to the Next Month" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "2026-07-28, selected",
    })).toBeInTheDocument();
  });

  it("keeps disabled PC dates closed and preserves native mobile/time controls", () => {
    const card = {
      schema: "2.0",
      body: {
        elements: [
          {
            tag: "date_picker",
            name: "disabled-date",
            label: { tag: "plain_text", content: "禁用日期" },
            initial_date: "2026-07-28",
            disabled: true,
          },
          { tag: "picker_time", name: "time", initial_time: "09:30" },
          {
            tag: "picker_datetime",
            name: "datetime",
            initial_datetime: "2026-07-28 09:30",
          },
        ],
      },
    } as const;
    const { rerender } = render(<CardRenderer card={card} device="pc" />);
    const trigger = screen.getByRole("combobox", {
      name: "禁用日期：2026-07-28",
    });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("time")).toHaveAttribute("type", "time");
    expect(screen.getByLabelText("datetime"))
      .toHaveAttribute("type", "datetime-local");

    rerender(<CardRenderer card={card} device="mobile" />);
    expect(screen.getByLabelText("禁用日期")).toHaveAttribute("type", "date");
  });

  it("keeps standalone PC date updates behind confirm and returns focus", async () => {
    const onAction = vi.fn();
    render(<CardRenderer
      device="pc"
      onAction={onAction}
      card={{
        schema: "2.0",
        body: {
          elements: [{
            tag: "date_picker",
            name: "confirmed-date",
            label: { tag: "plain_text", content: "确认日期" },
            initial_date: "2026-07-28",
            confirm: {
              title: { tag: "plain_text", content: "更新日期" },
              text: { tag: "plain_text", content: "是否更新？" },
            },
          }],
        },
      }}
    />);
    const trigger = screen.getByRole("combobox", {
      name: "确认日期：2026-07-28",
    });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "2026-07-29" }));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "更新日期" }))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAccessibleName("确认日期：2026-07-28");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "2026-07-29" }));
    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      value: "2026-07-29",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("exposes required state on the PC date Popover trigger", () => {
    render(<CardRenderer
      card={formControlsValidationCard}
      device="pc"
      onAction={() => {}}
    />);

    expect(screen.getByRole("combobox", {
      name: "日期：2026-07-28",
    })).toHaveAttribute("aria-required", "true");
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
