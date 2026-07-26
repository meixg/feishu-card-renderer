import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardRenderer } from "../../src";
import {
  completeContainerCard,
  defaultContainerCard,
  fiveLevelContainerCard,
  sixLevelContainerCard,
} from "../../src/fixtures/container-cards";

describe("container rendering", () => {
  it("recursively renders columns and form layout with stable protocol paths", () => {
    const { container } = render(<CardRenderer card={completeContainerCard} />);

    expect(screen.getByText("左栏")).toBeInTheDocument();
    expect(screen.getByText("右栏")).toBeInTheDocument();
    expect(screen.getByText("表单骨架").closest("form")).toHaveAttribute(
      "data-fcr-path",
      "$.body.elements[3]",
    );
    expect(container.querySelector('[data-fcr-depth="2"]')).toBeInTheDocument();
  });

  it("uses a local disclosure with stable controls for pointer and keyboard", () => {
    const { rerender } = render(<CardRenderer card={defaultContainerCard} />);
    const trigger = screen.getByRole("button", { name: "默认折叠" });
    const controls = trigger.getAttribute("aria-controls");

    expect(controls).toMatch(/^fcr-panel-/);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(controls!)).toHaveAttribute("hidden");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(controls!)).not.toHaveAttribute("hidden");

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(<CardRenderer card={defaultContainerCard} />);
    expect(screen.getByRole("button", { name: "默认折叠" }))
      .toHaveAttribute("aria-controls", controls);
  });

  it("keeps nested interactive children from bubbling to the parent seam", () => {
    const { container } = render(<CardRenderer card={completeContainerCard} />);
    const parent = container.querySelector(
      '[data-fcr-path="$.body.elements[1]"]',
    )!;
    const child = container.querySelector(
      '[data-fcr-path="$.body.elements[1].elements[0]"]',
    )!;
    let parentClicks = 0;
    parent.addEventListener("click", () => {
      parentClicks += 1;
    });

    fireEvent.click(within(child as HTMLElement).getByText("子交互优先"));
    expect(parentClicks).toBe(0);
  });

  it("renders five levels and replaces the sixth with a stable placeholder", () => {
    const five = render(<CardRenderer card={fiveLevelContainerCard} />);
    expect(screen.getByText("叶子")).toBeInTheDocument();
    expect(five.container.querySelectorAll(".fcr-collapsible-panel"))
      .toHaveLength(5);
    five.unmount();

    const six = render(<CardRenderer card={sixLevelContainerCard} />);
    expect(six.container.querySelectorAll(".fcr-collapsible-panel"))
      .toHaveLength(5);
    expect(within(six.container).getByRole("note"))
      .toHaveTextContent("不支持的卡片组件");
  });
});
