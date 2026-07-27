import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, expect, it } from "vitest";

import { CardRenderer } from "../../src";
import {
  formControlsValidationCard,
  standaloneDateControlsCard,
} from "../../src/fixtures/form-controls-card";

const axeOptions = {
  rules: { "color-contrast": { enabled: false } },
};

afterEach(cleanup);

it("keeps Field label, description, error, checkbox, and radio semantics accessible", async () => {
  const { container } = render(<CardRenderer
    card={formControlsValidationCard}
    onAction={() => {}}
  />);
  fireEvent.change(screen.getByRole("textbox", { name: "标题" }), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "提交" }));

  expect(screen.getByRole("textbox", { name: "标题" }))
    .toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("用于显示在卡片顶部")).toBeInTheDocument();
  expect(screen.getByText("此项为必填项")).toHaveAttribute("role", "alert");
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});

it("keeps the PC date Popover and calendar keyboard surface accessible", async () => {
  const { container } = render(<CardRenderer
    card={standaloneDateControlsCard}
    device="pc"
    onAction={() => {}}
  />);
  fireEvent.click(screen.getByRole("button", {
    name: "预约日期：2026-07-28",
  }));

  expect(screen.getByRole("dialog", { name: "选择预约日期" }))
    .toBeInTheDocument();
  expect(screen.getByRole("grid", { name: "2026年7月" }))
    .toBeInTheDocument();
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});

it("keeps mobile native date/time/datetime labels accessible", async () => {
  const { container } = render(<CardRenderer
    card={standaloneDateControlsCard}
    device="mobile"
    onAction={() => {}}
  />);
  expect(screen.getByLabelText("预约日期")).toHaveAttribute("type", "date");
  expect(screen.getByLabelText("预约时间")).toHaveAttribute("type", "time");
  expect(screen.getByLabelText("预约日期时间"))
    .toHaveAttribute("type", "datetime-local");
  expect((await axe(container, axeOptions)).violations).toEqual([]);
});
