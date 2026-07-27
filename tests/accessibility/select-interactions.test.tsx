import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, expect, it } from "vitest";

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
        { tag: "select_static", name: "single", required: true,
          label: text("Accessible single"), options },
        { tag: "multi_select_static", name: "multi", required: true,
          label: text("Accessible multi"), options, selected_values: [{ index: 0 }] },
        { tag: "button", form_action_type: "submit", text: text("Submit") },
      ],
    }],
  },
};
const axeOptions = { rules: { "color-contrast": { enabled: false } } };

it("keeps open PC Select/Combobox choices accessible", async () => {
  const { container } = render(<CardRenderer card={card} onAction={() => {}} />);
  fireEvent.click(screen.getByRole("combobox", { name: "Accessible single" }));
  expect(screen.getByRole("listbox")).toBeInTheDocument();
  expect((await axe(container, axeOptions)).violations).toEqual([]);
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
