import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/adapters/vchart-loader", () => ({
  loadVChartRuntime: async () => ({
    createChart: () => ({ update: vi.fn(), release: vi.fn() }),
  }),
}));

import { CardRenderer } from "../../src";
import {
  completeFieldEvidenceByTag,
  compatibilityFixturesByTag,
  findFixtureTarget,
} from "../../src/fixtures/compatibility-matrix";
import { CARD_COMPONENT_TAGS, validateCard } from "../../src/schema";

const domCases = CARD_COMPONENT_TAGS.flatMap((tag) =>
  Object.entries(completeFieldEvidenceByTag[tag])
    .filter(([, evidence]) => evidence === "dom-difference")
    .map(([field]) => [tag, field] as const)
);
const explicitCases = CARD_COMPONENT_TAGS.flatMap((tag) =>
  Object.entries(completeFieldEvidenceByTag[tag])
    .filter(([, evidence]) => evidence === "explicit-interaction")
    .map(([field]) => [tag, field] as const)
);

const resolveImage = async (key: string) =>
  `https://cdn.example.com/${key}.png`;
const resolvePerson = async (id: string) => ({
  id,
  name: `Resolved ${id}`,
  avatarUrl: `https://cdn.example.com/${id}.png`,
});
const ignoreAction = () => {};

function semanticSnapshot(container: HTMLElement): string {
  const controlState = [...container.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea")].map((control) => ({
    checked: "checked" in control ? control.checked : undefined,
    disabled: control.disabled,
    required: control.required,
    value: control instanceof HTMLSelectElement && control.multiple
      ? [...control.selectedOptions].map(({ value }) => value)
      : control.value,
  }));
  return JSON.stringify({
    html: container.innerHTML.replace(/_r_[0-9a-z]+_/gi, "_react_id_"),
    controlState,
  });
}

describe("complete field semantics", () => {
  it("keeps the explicit interaction verifier set closed and reviewable", () => {
    const explicit = CARD_COMPONENT_TAGS.flatMap((tag) =>
      Object.entries(completeFieldEvidenceByTag[tag])
        .filter(([, evidence]) => evidence === "explicit-interaction")
        .map(([field]) => `${tag}.${field}`)
    );
    expect(explicit).toEqual([
      "input.behaviors",
      "button.name",
      "button.value",
      "button.confirm",
      "button.behaviors",
      "overflow.name",
      "overflow.options",
      "select_static.behaviors",
    ]);
  });

  it.each(explicitCases)(
    "%s.%s has an observable action/dialog semantic",
    (tag, field) => {
      const complete = structuredClone(compatibilityFixturesByTag[tag].complete);
      const withoutField = structuredClone(complete);
      const completeTarget = findFixtureTarget(complete, tag)!;
      const target = findFixtureTarget(withoutField, tag)!;
      if (tag === "button" && field === "value") {
        delete completeTarget.behaviors;
        delete target.behaviors;
      }
      if (tag === "button" && field === "behaviors") {
        completeTarget.behaviors = [{
          type: "callback",
          value: { fromBehavior: true },
        }];
      }
      if ((tag === "input" || tag === "select_static") &&
        field === "behaviors") {
        completeTarget.behaviors = [{
          type: "open_url",
          pc_url: "https://example.com/behavior",
        }];
      }
      delete target[field];

      const exercise = (card: unknown) => {
        const onAction = vi.fn();
        const result = render(<CardRenderer card={card} onAction={onAction} />);
        let dialogShown = false;
        if (tag === "input") {
          fireEvent.change(within(result.container).getByRole("textbox"), {
            target: { value: "changed" },
          });
        } else if (tag === "select_static") {
          const select = within(result.container).getByRole("combobox");
          fireEvent.click(select);
          const option = within(result.container)
            .getByRole("option", { name: "A" });
          fireEvent.pointerDown(option, { pointerType: "mouse" });
          fireEvent.click(option);
        } else if (tag === "overflow") {
          fireEvent.click(within(result.container)
            .getByRole("button", { name: "更多操作" }));
          const item = within(result.container)
            .queryByRole("menuitem", { name: "Option" });
          if (item) fireEvent.click(item);
        } else {
          fireEvent.click(within(result.container)
            .getByRole("button", { name: "Button" }));
          const dialog = within(result.container).queryByRole("alertdialog");
          dialogShown = dialog !== null;
          if (dialog) {
            fireEvent.click(within(dialog)
              .getByRole("button", { name: "确认" }));
          }
        }
        const outcome = JSON.stringify({
          actions: onAction.mock.calls,
          dialogShown,
        });
        result.unmount();
        cleanup();
        return outcome;
      };

      expect(exercise(complete), `${tag}.${field}`)
        .not.toBe(exercise(withoutField));
    },
  );

  it.each(domCases)(
    "%s.%s has observable DOM/ARIA/style semantics",
    async (tag, field) => {
      const complete = structuredClone(compatibilityFixturesByTag[tag].complete);
      const withoutField = structuredClone(complete);
      const completeTarget = findFixtureTarget(complete, tag)!;
      const target = findFixtureTarget(withoutField, tag)!;
      if (field === "elements") {
        completeTarget.elements = [{ tag: "div", text: {
          tag: "plain_text", content: "semantic child",
        } }];
      }
      if (field === "vertical_spacing") {
        completeTarget.direction = "vertical";
        target.direction = "vertical";
      }
      if (field === "aspect_ratio") {
        delete completeTarget.height;
        delete target.height;
        completeTarget.aspect_ratio = "4:3";
      }
      if (field === "page_size") {
        completeTarget.rows = [{ amount: 1 }, { amount: 2 }];
        target.rows = [{ amount: 1 }, { amount: 2 }];
      }
      if (field === "initial_option") {
        delete completeTarget.initial_index;
        delete target.initial_index;
      }
      if (field === "initial_index") {
        delete completeTarget.initial_option;
        delete target.initial_option;
      }
      if (field === "show_avatar" || field === "show_name") {
        completeTarget[field] = false;
      }
      if (field === "disabled") completeTarget[field] = true;
      if (field === "disabled_tips") {
        completeTarget.disabled = true;
        target.disabled = true;
      }
      if (field === "name") {
        for (const hidden of ["label", "placeholder", "text"]) {
          delete completeTarget[hidden];
          delete target[hidden];
        }
      }
      delete target[field];
      const result = render(<CardRenderer
        card={complete}
        onAction={ignoreAction}
        resolveImage={resolveImage}
        resolvePerson={resolvePerson}
      />);
      await act(async () => {});
      const completeSnapshot = semanticSnapshot(result.container);
      result.rerender(<CardRenderer
        card={structuredClone(complete)}
        onAction={ignoreAction}
        resolveImage={resolveImage}
        resolvePerson={resolvePerson}
      />);
      await act(async () => {});
      expect(
        semanticSnapshot(result.container),
        `${tag}.${field} negative control`,
      ).toBe(completeSnapshot);
      result.rerender(<CardRenderer
        key={`without-${tag}-${field}`}
        card={withoutField}
        onAction={ignoreAction}
        resolveImage={resolveImage}
        resolvePerson={resolvePerson}
      />);
      await act(async () => {});
      expect(completeSnapshot, `${tag}.${field}`)
        .not.toBe(semanticSnapshot(result.container));
      result.unmount();
      cleanup();
    },
  );

  it.each(CARD_COMPONENT_TAGS)(
    "%s.element_id has executable identity validation evidence",
    (tag) => {
      const evidence = completeFieldEvidenceByTag[tag].element_id;
      expect(evidence).toBe("identity-diagnostic");
      const card = structuredClone(compatibilityFixturesByTag[tag].complete);
      const target = findFixtureTarget(card, tag);
      target!.element_id = "1_invalid";
      expect(validateCard(card).diagnostics.map(({ code }) => code))
        .toContain("invalid_element_id");
    },
  );

  it("form.name has executable required-field diagnostic evidence", () => {
    expect(completeFieldEvidenceByTag.form.name).toBe("required-diagnostic");
    const card = structuredClone(compatibilityFixturesByTag.form.complete);
    delete findFixtureTarget(card, "form")!.name;
    expect(validateCard(card).diagnostics.map(({ code }) => code))
      .toContain("form_name_required");
  });

  it("img fields drive the resolved resource, accessible text, and safe style", async () => {
    const { container } = render(<CardRenderer
      card={compatibilityFixturesByTag.img.complete}
      resolveImage={async () => "https://cdn.example.com/complete.png"}
    />);
    await act(async () => {});

    const image = screen.getByRole("img", { name: "Complete image" });
    expect(image).toHaveAttribute("src", "https://cdn.example.com/complete.png");
    expect(image).toHaveAttribute("title", "Image title");
    expect(container.querySelector(".fcr-image")).toHaveStyle({
      margin: "4px 0px",
      borderRadius: "8px",
    });
  });

  it("markdown visual fields drive safe typography, alignment, icon, and spacing", () => {
    const { container } = render(<CardRenderer
      card={compatibilityFixturesByTag.markdown.complete}
    />);
    const markdown = container.querySelector<HTMLElement>(".fcr-markdown")!;
    expect(markdown).toHaveAttribute("data-text-size", "heading");
    expect(markdown).toHaveAttribute("data-text-align", "center");
    expect(markdown).toHaveStyle({
      margin: "4px 0px",
      textAlign: "center",
      fontSize: "var(--fcr-markdown-font-size-heading)",
    });
    expect(markdown.querySelector("[data-icon-token='info_outlined']"))
      .not.toBeNull();
  });

  it("markdown resolves device text-size and dark color theme without mutating input", () => {
    const card = Object.freeze({
      schema: "2.0",
      config: Object.freeze({
        style: Object.freeze({
          text_size: Object.freeze({
            compact: Object.freeze({
              default: "normal", pc: "heading", mobile: "notation",
            }),
          }),
          color: Object.freeze({
            accent: Object.freeze({
              light_mode: "rgba(51,112,255,1)",
              dark_mode: "rgba(130,167,255,1)",
            }),
          }),
        }),
      }),
      body: Object.freeze({
        elements: Object.freeze([Object.freeze({
          tag: "markdown", content: "Theme", text_size: "compact",
          icon: Object.freeze({
            tag: "standard_icon", token: "info_outlined", color: "accent",
          }),
        })]),
      }),
    });
    const before = JSON.stringify(card);
    const { container } = render(<CardRenderer card={card}
      device="mobile" colorScheme="dark" />);
    expect(container.querySelector(".fcr-markdown")).toHaveStyle({
      fontSize: "var(--fcr-markdown-font-size-notation)",
      "--fcr-markdown-icon-color": "rgba(130,167,255,1)",
    });
    expect(JSON.stringify(card)).toBe(before);
  });

  it("button fields drive confirmation and the standardized action", () => {
    const onAction = vi.fn();
    render(<CardRenderer
      card={compatibilityFixturesByTag.button.complete}
      onAction={onAction}
    />);

    fireEvent.click(screen.getByRole("button", { name: "Button" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Continue?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "确认" }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "callback",
      value: { complete: true },
      source: expect.objectContaining({
        tag: "button",
        name: "button",
        elementId: "complete_button",
      }),
    }));
  });

  it("input and select behaviors emit their field-specific callbacks", () => {
    const onAction = vi.fn();
    const input = render(<CardRenderer
      card={compatibilityFixturesByTag.input.complete}
      onAction={onAction}
    />);
    fireEvent.change(within(input.container).getByRole("textbox"), {
      target: { value: "changed" },
    });
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "callback",
      source: expect.objectContaining({ tag: "input", name: "field" }),
    }));
    input.unmount();

    onAction.mockClear();
    const select = render(<CardRenderer
      card={compatibilityFixturesByTag.select_static.complete}
      onAction={onAction}
    />);
    fireEvent.click(within(select.container).getByRole("combobox"));
    const option = within(select.container).getByRole("option", { name: "A" });
    fireEvent.pointerDown(option, { pointerType: "mouse" });
    fireEvent.click(option);
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      type: "callback",
      source: expect.objectContaining({ tag: "select_static", name: "static" }),
    }));
    select.unmount();
  });

  it("overflow name participates in its standardized action source", () => {
    const onAction = vi.fn();
    const { container } = render(<CardRenderer
      card={compatibilityFixturesByTag.overflow.complete}
      onAction={onAction}
    />);
    fireEvent.click(within(container).getByRole("button", { name: "更多操作" }));
    fireEvent.click(within(container).getByRole("menuitem", { name: "Option" }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      source: expect.objectContaining({
        tag: "overflow",
        name: "overflow",
      }),
    }));
  });

  it("checker fields drive native checked, required, label, and disabled semantics", () => {
    const { rerender } = render(<CardRenderer
      card={compatibilityFixturesByTag.checker.complete}
    />);
    const checkbox = screen.getByRole("checkbox", { name: "Checked" });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeRequired();
    expect(checkbox).not.toBeDisabled();

    rerender(<CardRenderer card={{
      schema: "2.0",
      body: { elements: [{
        tag: "checker",
        name: "checker",
        text: { tag: "plain_text", content: "Disabled checker" },
        disabled: true,
      }] },
    }} />);
    expect(screen.getByRole("checkbox", { name: "Disabled checker" }))
      .toBeDisabled();
  });
});
