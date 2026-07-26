import { describe, expect, it } from "vitest";

import {
  CARD_COMPONENT_TAGS,
  CARD_COMPONENT_SCHEMAS,
  isCardElement,
  normalizeCard,
  validateCard,
  type Card,
  type CardElement,
} from "../../src";
import {
  cardWithEveryComponent,
  minimalCardsByTag,
} from "../../src/fixtures/schema-cards";

function codes(result: ReturnType<typeof validateCard>): string[] {
  return result.diagnostics.map(({ code }) => code);
}

describe("JSON 2.0 schema core", () => {
  it("defines a discriminated runtime and TypeScript schema for every required tag", () => {
    expect(Object.keys(minimalCardsByTag).sort()).toEqual(
      [...CARD_COMPONENT_TAGS].sort(),
    );

    for (const [tag, card] of Object.entries(minimalCardsByTag)) {
      const result = validateCard(card);
      expect(result.fatal, tag).toBe(false);
      expect(
        result.diagnostics.filter(({ severity }) => severity === "error"),
        tag,
      ).toEqual([]);
      expect(CARD_COMPONENT_SCHEMAS[tag as keyof typeof CARD_COMPONENT_SCHEMAS])
        .toBeDefined();
    }
    expect(isCardElement({ tag: "hr" })).toBe(true);
    expect(isCardElement({ tag: "future_widget" })).toBe(false);

    const typedCard: Card = cardWithEveryComponent;
    const typedElements: CardElement[] = typedCard.body?.elements ?? [];
    expect(typedElements.length).toBeGreaterThan(0);
  });

  it.each([null, [], "card", 2])(
    "returns a fatal diagnostic instead of throwing for non-object input %#",
    (input) => {
      expect(() => validateCard(input)).not.toThrow();
      const result = validateCard(input);
      expect(result).toMatchObject({ fatal: true, valid: false, card: null });
      expect(result.diagnostics[0]).toMatchObject({
        code: "invalid_root",
        classification: "fatal",
        path: "$",
      });
    },
  );

  it.each([{}, { schema: "1.0" }, { schema: 2 }])(
    "requires an explicit schema 2.0 declaration %#",
    (input) => {
      const result = validateCard(input);
      expect(result.fatal).toBe(true);
      expect(result.diagnostics[0]).toMatchObject({
        code: "invalid_schema",
        path: "$.schema",
      });
    },
  );

  it("accepts an empty JSON 2.0 card", () => {
    expect(validateCard({ schema: "2.0" })).toEqual({
      valid: true,
      fatal: false,
      card: { schema: "2.0" },
      diagnostics: [],
    });
  });

  it("reports recoverable root, header, config, enum, and unknown-tag errors", () => {
    const input = {
      schema: "2.0",
      config: { update_multi: false, width_mode: "wide" },
      header: { template: "blue" },
      body: {
        direction: "diagonal",
        elements: [{ tag: "future_widget", future: true }],
      },
    };

    const result = validateCard(input);
    expect(result.fatal).toBe(false);
    expect(codes(result)).toEqual([
      "update_multi_must_be_true",
      "invalid_enum",
      "header_title_required",
      "invalid_enum",
      "unknown_tag",
    ]);
    expect(result.diagnostics.at(-1)).toMatchObject({
      classification: "recoverable",
      path: "$.body.elements[0].tag",
    });
  });

  it("validates globally unique element_id and form names", () => {
    const result = validateCard({
      schema: "2.0",
      body: {
        elements: [
          { tag: "div", element_id: "1bad", text: { tag: "plain_text", content: "a" } },
          { tag: "hr", element_id: "dup" },
          { tag: "hr", element_id: "dup" },
          {
            tag: "form",
            name: "form",
            elements: [
              { tag: "input", name: "field" },
              { tag: "input", name: "field" },
              {
                tag: "button",
                name: "submit",
                form_action_type: "submit",
                text: { tag: "plain_text", content: "Submit" },
              },
            ],
          },
          {
            tag: "form",
            name: "form",
            elements: [
              {
                tag: "button",
                form_action_type: "submit",
                text: { tag: "plain_text", content: "Submit" },
              },
            ],
          },
        ],
      },
    });

    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "invalid_element_id",
        "duplicate_element_id",
        "duplicate_form_name",
        "duplicate_form_field_name",
        "form_field_name_required",
      ]),
    );
  });

  it("counts every object with a string tag and degrades node 201 onward", () => {
    const elements = Array.from({ length: 101 }, (_, index) => ({
      tag: "div",
      text: { tag: "plain_text", content: String(index) },
    }));
    const input = { schema: "2.0", body: { elements } };

    const validation = validateCard(input);
    expect(validation.diagnostics.filter(({ code }) => code === "component_limit"))
      .toHaveLength(2);
    expect(validation.diagnostics.at(-2)?.path).toBe(
      "$.body.elements[100].tag",
    );
    expect(validation.diagnostics.at(-1)?.path).toBe(
      "$.body.elements[100].text.tag",
    );

    const normalized = normalizeCard(input);
    expect(normalized.card?.body?.elements[100]).toMatchObject({
      tag: "__unsupported",
      originalTag: "div",
      reason: "component_limit",
      path: "$.body.elements[100]",
    });
  });

  it("accepts exactly 200 string-tag nodes without a limit diagnostic", () => {
    const elements = Array.from({ length: 100 }, (_, index) => ({
      tag: "div",
      text: { tag: "plain_text", content: String(index) },
    }));
    expect(codes(validateCard({
      schema: "2.0",
      body: { elements },
    }))).not.toContain("component_limit");
  });

  it("allows five counted container levels and degrades the sixth", () => {
    const nested = (levels: number): unknown =>
      levels === 0
        ? { tag: "hr" }
        : {
            tag: "collapsible_panel",
            elements: [nested(levels - 1)],
          };

    expect(codes(validateCard({
      schema: "2.0",
      body: { elements: [nested(5)] },
    }))).not.toContain("container_depth");

    const input = {
      schema: "2.0",
      body: { elements: [nested(6)] },
    };
    const result = validateCard(input);
    expect(result.diagnostics.find(({ code }) => code === "container_depth"))
      .toMatchObject({
        path: "$.body.elements[0].elements[0].elements[0].elements[0].elements[0].elements[0].tag",
      });
    expect(normalizeCard(input).card?.body?.elements[0]).toMatchObject({
      tag: "collapsible_panel",
    });
  });

  it("counts column_set and column independently while body does not count", () => {
    const input = {
      schema: "2.0",
      body: {
        elements: [{
          tag: "column_set",
          columns: [{
            tag: "column",
            elements: [{
              tag: "interactive_container",
              elements: [{
                tag: "collapsible_panel",
                elements: [{
                  tag: "column_set",
                  columns: [{ tag: "column", elements: [] }],
                }],
              }],
            }],
          }],
        }],
      },
    };
    expect(codes(validateCard(input))).toContain("container_depth");
  });

  it("enforces critical nesting and form rules as recoverable diagnostics", () => {
    const result = validateCard({
      schema: "2.0",
      body: {
        elements: [
          { tag: "multi_select_static", options: [] },
          { tag: "multi_select_person", options: [] },
          { tag: "select_img", multi_select: true, options: [] },
          { tag: "column_set", columns: [{ tag: "column", elements: [{ tag: "table" }] }] },
          { tag: "interactive_container", elements: [{ tag: "form", name: "nested", elements: [] }] },
          { tag: "collapsible_panel", elements: [{ tag: "form", name: "nested2", elements: [] }] },
          { tag: "form", name: "no_submit", elements: [{ tag: "chart", chart_spec: {} }] },
          {
            tag: "table",
            columns: [],
            rows: [{ bad: { tag: "button" } }],
          },
        ],
      },
    });

    expect(codes(result)).toEqual(expect.arrayContaining([
      "form_only_component",
      "select_img_multi_requires_form",
      "root_only_component",
      "forbidden_child",
      "form_submit_required",
      "form_chart_forbidden",
      "forbidden_child",
    ]));
    expect(result.fatal).toBe(false);
  });

  it("normalizes defaults, preserves unknown fields, and never mutates input", () => {
    const input = {
      schema: "2.0",
      future_root: { enabled: true },
      config: { future_config: true },
      body: {
        elements: [{
          tag: "interactive_container",
          future_element: 42,
          elements: [],
        }],
      },
    };
    const before = structuredClone(input);
    const result = normalizeCard(input);

    expect(input).toEqual(before);
    expect(result.card).toMatchObject({
      schema: "2.0",
      future_root: { enabled: true },
      config: {
        update_multi: true,
        width_mode: "default",
        future_config: true,
      },
      body: {
        direction: "vertical",
        horizontal_align: "left",
        vertical_align: "top",
        elements: [{
          tag: "interactive_container",
          direction: "vertical",
          future_element: 42,
        }],
      },
    });
    expect(result.card).not.toBe(input);
    expect(result.card?.body).not.toBe(input.body);
  });
});
