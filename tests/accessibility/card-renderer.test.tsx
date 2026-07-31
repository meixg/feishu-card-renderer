import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../../src/adapters/vchart-loader", () => ({
  loadVChartRuntime: async () => ({
    createChart: () => ({ update: vi.fn(), release: vi.fn() }),
  }),
}));

import { CardRenderer } from "../../src";
import { completeComplexContentCard } from "../../src/fixtures/complex-content";
import { completeContainerCard } from "../../src/fixtures/container-cards";
import { completeInteractiveCard } from "../../src/fixtures/interactive-card";
import workspaceForm from "../fixtures/workspace-form.json";

afterEach(cleanup);

it("has no detectable accessibility violations", async () => {
  const { container } = render(<CardRenderer card={{ schema: "2.0",
    header: { title: { tag: "plain_text", content: "Title" } },
    body: { elements: [{ tag: "img", img_key: "x",
      alt: { tag: "plain_text", content: "Diagram" } }] },
  }} />);
  // jsdom cannot compute layout/canvas contrast; release-audit.test.ts checks
  // every shipped theme token numerically instead.
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });

  expect(results.violations).toEqual([]);
});

it("keeps complex content and preview controls accessible", async () => {
  const { container } = render(<CardRenderer card={completeComplexContentCard}
    resolveImage={(key) => `https://cdn.example.com/${key}.png`}
    resolvePerson={(id) => ({ id, name: "Person" })} />);
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});

it("keeps recursive containers and disclosure controls accessible", async () => {
  const { container } = render(
    <CardRenderer card={completeContainerCard} />,
  );
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});

it("keeps form controls, menus, and business-action disabled states accessible", async () => {
  const { container } = render(
    <CardRenderer card={completeInteractiveCard} />,
  );
  const results = await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  expect(results.violations).toEqual([]);
});

it("keeps Workspace required errors and keyboard submission accessible", async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  const { container, getByRole } = render(
    <CardRenderer card={workspaceForm} onAction={onAction} />,
  );
  const input = getByRole("textbox", { name: "Fixture note" });
  const select = getByRole("combobox", { name: "Fixture choice" });
  const submit = getByRole("button", { name: "Submit fixture" });
  expect(input).toBeRequired();
  expect(select).toHaveAttribute("aria-required", "true");

  await user.tab();
  expect(input).toHaveFocus();
  await user.tab();
  expect(select).toHaveFocus();
  await user.tab();
  expect(submit).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onAction).not.toHaveBeenCalled();
  const errors = container.querySelectorAll('[role="alert"]');
  expect(errors).toHaveLength(2);
  expect(errors[0]).toHaveTextContent(/required|必填/i);
  expect(errors[1]).toHaveTextContent(/required|必填/i);
  expect(errors[0]?.id).not.toBe("");
  expect(errors[1]?.id).not.toBe("");
  expect(errors[0]?.id).not.toBe(errors[1]?.id);
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(select).toHaveAttribute("aria-invalid", "true");
  expect(input.getAttribute("aria-describedby")?.split(" "))
    .toContain(errors[0]?.id);
  expect(select.getAttribute("aria-describedby")?.split(" "))
    .toContain(errors[1]?.id);

  expect(input).toHaveFocus();
  await user.keyboard("keyboard note");
  await user.tab();
  await user.keyboard("{Enter}{ArrowDown}{Enter}");
  await user.tab();
  expect(submit).toHaveFocus();
  await user.keyboard(" ");

  expect(onAction).toHaveBeenCalledTimes(1);
  expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
    type: "callback",
    value: workspaceForm.body.elements[1]!.elements![2]!.behaviors![0]!.value,
    formValue: { note: "keyboard note", choice: "a" },
  }));
  expect((await axe(container, {
    rules: { "color-contrast": { enabled: false } },
  })).violations).toEqual([]);
});
