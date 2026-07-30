import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, expect, it, vi } from "vitest";

import { CardRenderer } from "../../src";

afterEach(cleanup);

const text = (content: string) => ({ tag: "plain_text", content });
const options = Array.from({ length: 9 }, (_, index) => ({
  text: text(`Option ${index}`),
  value: { index },
}));
const card = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "form",
      name: "choices",
      elements: [
        { tag: "select_static", name: "small", required: true,
          label: text("Accessible small"), options: options.slice(0, 2) },
        { tag: "select_static", name: "single", required: true,
          label: text("Accessible single"), options },
        { tag: "multi_select_static", name: "multi", required: true,
          label: text("Accessible multi"),
          options: options.map((item, index) => ({
            ...item,
            ...(index === 1 ? { disabled: true } : {}),
          })),
          selected_values: [{ index: 0 }] },
        { tag: "button", form_action_type: "submit", text: text("Submit") },
      ],
    }],
  },
};
const axeOptions = { rules: { "color-contrast": { enabled: false } } };

it("keeps an open required PC Select accessible with focus return", async () => {
  const { container } = render(<CardRenderer card={card} onAction={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  const trigger = screen.getByRole("combobox", { name: "Accessible small" });
  expect(trigger).toHaveAttribute("aria-required", "true");
  expect(trigger).toHaveAttribute("aria-invalid", "true");
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  expect(screen.getByRole("listbox")).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Option 0" }))
    .toHaveAttribute("aria-selected", "false");
  expect((await axe(container, axeOptions)).violations).toEqual([]);
  fireEvent.keyDown(screen.getByRole("option", { name: "Option 0" }), {
    key: "Escape",
  });
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("keeps an open required PC single Combobox accessible with focus return", async () => {
  const { container } = render(<CardRenderer card={card} onAction={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  const trigger = screen.getByRole("combobox", { name: "Accessible single" });
  expect(trigger).toHaveAttribute("aria-required", "true");
  expect(trigger).toHaveAttribute("aria-invalid", "true");
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  const search = screen.getByRole("combobox", { name: "搜索Accessible single" });
  await waitFor(() => expect(search).toHaveFocus());
  expect((await axe(container, axeOptions)).violations).toEqual([]);
  fireEvent.keyDown(search, { key: "Escape" });
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("keeps open selected, required, disabled PC multiple chips accessible", async () => {
  const { container } = render(<CardRenderer card={card} onAction={() => {}} />);
  const input = screen.getByRole("combobox", { name: "搜索Accessible multi" });
  expect(input).toHaveAttribute("aria-required", "true");
  expect(screen.getByRole("button", { name: "移除 Option 0" }))
    .toHaveAttribute("aria-disabled", "false");
  input.focus();
  expect(input).toHaveFocus();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input).toHaveAttribute("aria-expanded", "true");
  await waitFor(() => expect(input).toHaveFocus());
  expect(screen.getByRole("option", { name: "Option 0" }))
    .toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("option", { name: "Option 1" }))
    .toHaveAttribute("aria-disabled", "true");
  expect((await axe(container, axeOptions)).violations).toEqual([]);
  fireEvent.keyDown(input, { key: "Escape" });
  await waitFor(() => expect(input).toHaveFocus());
});

it("keeps the mobile Drawer, search, listbox, chips, and close controls accessible", async () => {
  const { container } = render(
    <CardRenderer card={card} device="mobile" onAction={() => {}} />,
  );
  fireEvent.click(screen.getByRole("button", {
    name: "Accessible multi，打开选项",
  }));
  expect(screen.getByRole("dialog", { name: "Accessible multi" }))
    .toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "搜索Accessible multi" }))
    .toBeInTheDocument();
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});

it("covers public mobile Drawer ARIA states for single, multi, person, empty, and disabled", async () => {
  const never = new Promise<never>(() => {});
  const resolvePerson = vi.fn((id: string) =>
    id === "person-loading"
      ? never
      : Promise.resolve({ id, name: "Ready person" }));
  const { container } = render(
    <CardRenderer
      card={{
        schema: "2.0",
        body: { elements: [{
          tag: "form",
          name: "mobile-aria",
          elements: [
            { tag: "select_static", name: "required-single", required: true,
              label: text("Required single"), options: options.slice(0, 2) },
            { tag: "select_static", name: "empty",
              label: text("Empty single"), options: [] },
            { tag: "select_static", name: "disabled", disabled: true,
              label: text("Disabled single"), options: options.slice(0, 1) },
            { tag: "multi_select_static", name: "selected-multi", required: true,
              label: text("Selected multi"), options: options.slice(0, 3),
              selected_values: [{ index: 0 }] },
            { tag: "select_person", name: "people", label: text("People"),
              options: [{ value: "person-ready" }, { value: "person-loading" }] },
            { tag: "button", form_action_type: "submit", text: text("Validate") },
          ],
        }] },
      }}
      device="mobile"
      onAction={() => {}}
      resolvePerson={resolvePerson}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  const required = screen.getByRole("button", {
    name: "Required single，打开选项",
  });
  expect(required).toHaveAttribute("aria-required", "true");
  expect(required).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("button", { name: "Disabled single，打开选项" }))
    .toBeDisabled();
  expect(screen.getByRole("button", { name: "移除 Option 0" }))
    .toBeInTheDocument();

  for (const [triggerName, dialogName] of [
    ["Required single，打开选项", "Required single"],
    ["Empty single，打开选项", "Empty single"],
    ["Selected multi，打开选项", "Selected multi"],
    ["People，打开选项", "People"],
  ]) {
    const trigger = screen.getByRole("button", { name: triggerName });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: dialogName });
    if (dialogName === "Empty single") {
      expect(within(dialog).getByText(/没有匹配项/u)).toBeInTheDocument();
    }
    if (dialogName === "Selected multi") {
      expect(within(dialog).getByRole("option", { name: "Option 0" }))
        .toHaveAttribute("aria-selected", "true");
    }
    if (dialogName === "People") {
      expect(await within(dialog).findByRole("option", { name: "Ready person" }))
        .toBeInTheDocument();
      expect(within(dialog).getByRole("option", { name: "人员信息加载中" }))
        .toBeInTheDocument();
    }
    expect((await axe(container, axeOptions)).violations).toEqual([]);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
  expect(container).not.toHaveTextContent(/person-ready|person-loading/);
});

it("announces person loading and error states without exposing person IDs", async () => {
  const never = new Promise<never>(() => {});
  const resolvePerson = vi.fn((id: string) =>
    id === "ou_loading"
      ? never
      : Promise.reject(new Error("resolver unavailable")));
  const { container } = render(
    <CardRenderer
      card={{
        schema: "2.0",
        body: { elements: [{
          tag: "select_person",
          name: "person",
          label: text("Accessible people"),
          options: [{ value: "ou_loading" }, { value: "ou_error" }],
        }] },
      }}
      device="mobile"
      onAction={() => {}}
      resolvePerson={resolvePerson}
    />,
  );

  const status = await screen.findByRole("status", {
    name: "Accessible people人员解析状态",
  });
  await waitFor(() => {
    expect(status).toHaveTextContent("正在加载 1 个人员选项");
    expect(status).toHaveTextContent("1 个人员选项加载失败");
  });
  expect(container).not.toHaveTextContent(/ou_loading|ou_error/);
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});
