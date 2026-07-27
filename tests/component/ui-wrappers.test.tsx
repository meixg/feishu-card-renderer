import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../../src/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../../src/components/ui/field";

describe("internal UI wrappers", () => {
  it("forwards composition refs and props without nesting buttons", () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    const { container } = render(
      <Button
        ref={ref}
        render={<button data-render-prop="preserved" />}
        type="button"
        aria-label="Composed action"
        data-wrapper-prop="preserved"
        onClick={onClick}
      >
        Run
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Composed action" });
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(button).toHaveAttribute("data-render-prop", "preserved");
    expect(button).toHaveAttribute("data-wrapper-prop", "preserved");
    expect(ref.current).toBe(button);

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("composes field labels, descriptions, and errors as semantic text", () => {
    render(
      <Field data-field-owner="renderer">
        <FieldLabel htmlFor="project-name">Project</FieldLabel>
        <FieldDescription id="project-name-description">
          Visible help
        </FieldDescription>
        <input id="project-name" aria-describedby="project-name-description" />
        <FieldError>Required field</FieldError>
      </Field>,
    );

    expect(screen.getByLabelText("Project")).toBeInTheDocument();
    expect(screen.getByText("Visible help")).toHaveAttribute(
      "id",
      "project-name-description",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required field");
    expect(screen.getByRole("alert").closest("[data-field-owner]"))
      .toHaveAttribute("data-field-owner", "renderer");
  });
});
