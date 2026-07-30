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

  it("normalizes protocol Button visual defaults and diagnoses invalid enums", () => {
    const input = {
      schema: "2.0",
      body: { elements: [
        { tag: "button", text: { tag: "plain_text", content: "默认" } },
        { tag: "button", type: "brand", size: "huge", width: "auto" },
      ] },
    };

    expect(normalizeCard(input).card?.body.elements).toMatchObject([
      { type: "default", size: "medium", width: "default" },
      { type: "default", size: "medium", width: "default" },
    ]);
    expect(validateCard(input).diagnostics.map(({ path }) => path)).toEqual([
      "$.body.elements[1].type",
      "$.body.elements[1].size",
      "$.body.elements[1].width",
    ]);
  });

  it("accepts only the officially documented Button type enum", () => {
    const types = [
      "default", "primary", "danger", "text", "primary_text", "danger_text",
      "primary_filled", "danger_filled", "laser",
    ];
    const elements = types.map((type) => ({ tag: "button", type }));

    expect(validateCard({
      schema: "2.0",
      body: { elements },
    }).diagnostics).toEqual([]);
    expect(normalizeCard({
      schema: "2.0",
      body: { elements },
    }).card?.body.elements.map((element) =>
      "type" in element ? element.type : undefined)).toEqual(types);
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

  it("excludes opaque pseudo components from component diagnostics and limits", () => {
    const pseudo = Array.from({ length: 300 }, (_, index) => ({
      tag: `future_${index}`,
      element_id: "not valid",
      padding: "100px",
      elements: [{ tag: "collapsible_panel", elements: [] }],
    }));
    const input = {
      schema: "2.0",
      body: {
        elements: [
          ...Array.from({ length: 199 }, () => ({ tag: "hr" })),
          { tag: "chart", chart_spec: { pseudo } },
        ],
      },
      future_extension: { pseudo },
    };
    const excluded = new Set([
      "unknown_tag",
      "invalid_style",
      "invalid_element_id",
      "container_depth",
      "component_limit",
    ]);

    expect(validateCard(input).diagnostics.filter(({ code }) =>
      excluded.has(code))).toEqual([]);
    expect(validateCard({
      schema: "2.0",
      body: {
        elements: Array.from({ length: 201 }, () => ({ tag: "hr" })),
      },
    }).diagnostics.filter(({ code }) => code === "component_limit"))
      .toHaveLength(1);
  });

  it("keeps config and body roots out of component traversal", () => {
    const pseudo = {
      tag: "future_root",
      element_id: "not valid",
      elements: Array.from({ length: 250 }, () => ({ tag: "hr" })),
    };
    const result = validateCard({
      schema: "2.0",
      config: {
        ...pseudo,
        width_mode: "wide",
        direction: "opaque_config_value",
      },
      body: {
        tag: "future_body",
        element_id: "also invalid",
        direction: "diagonal",
        width_mode: "opaque_body_value",
        future_elements: pseudo.elements,
        elements: [{ tag: "hr" }],
      },
    });
    const componentCodes = new Set([
      "unknown_tag",
      "invalid_element_id",
      "component_limit",
      "container_depth",
    ]);

    expect(result.diagnostics.filter(({ code }) => componentCodes.has(code)))
      .toEqual([]);
    expect(result.diagnostics.filter(({ code }) => code === "invalid_enum")
      .map(({ path }) => path).sort()).toEqual([
        "$.body.direction",
        "$.config.width_mode",
      ]);
  });

  it("uses exact tagged child fields and keeps same-named extensions opaque", () => {
    const pseudo = {
      tag: "person",
      element_id: "opaque-invalid-id",
      margin: ["opaque"],
    };
    const realText = (content: string) => ({
      tag: "plain_text",
      content,
      element_id: "real-invalid-id",
    });
    const card = {
      schema: "2.0",
      body: {
        elements: [
          { tag: "chart", text: pseudo, title: pseudo, alt: pseudo },
          { tag: "table", text: pseudo, title: pseudo, alt: pseudo },
          { tag: "person", text: pseudo, title: pseudo, alt: pseudo },
          {
            tag: "div",
            text: realText("div"),
          },
          {
            tag: "button",
            text: realText("button"),
          },
          {
            tag: "img",
            alt: realText("alt"),
            title: realText("title"),
          },
          {
            tag: "img_combination",
            img_list: [{ alt: realText("combination alt") }],
          },
          {
            tag: "collapsible_panel",
            header: { title: realText("panel") },
            elements: [],
          },
        ],
      },
    };
    const normalized = normalizeCard(card).card;
    const invalidIdPaths = validateCard(card).diagnostics
      .filter(({ code }) => code === "invalid_element_id")
      .map(({ path }) => path);

    expect(invalidIdPaths).toEqual([
      "$.body.elements[3].text.element_id",
      "$.body.elements[4].text.element_id",
      "$.body.elements[5].alt.element_id",
      "$.body.elements[5].title.element_id",
      "$.body.elements[6].img_list[0].alt.element_id",
      "$.body.elements[7].header.title.element_id",
    ]);
    for (const index of [0, 1, 2]) {
      const element = normalized?.body.elements[index] as
        | Record<string, unknown>
        | undefined;
      expect(element?.text).toEqual(pseudo);
      expect(element?.title).toEqual(pseudo);
      expect(element?.alt).toEqual(pseudo);
    }
  });

  it("counts only exact top-level header tagged children with stable paths", () => {
    const card = {
      schema: "2.0",
      header: {
        title: { tag: "plain_text", content: "title" },
        subtitle: { tag: "plain_text", content: "subtitle" },
        icon: { tag: "standard_icon", token: "chat_outlined" },
        text_tag_list: [{ tag: "text_tag", text: "tag" }],
        future_header: {
          tag: "collapsible_panel",
          elements: Array.from({ length: 20 }, () => ({ tag: "hr" })),
        },
      },
      body: {
        elements: Array.from({ length: 197 }, () => ({ tag: "hr" })),
      },
    };
    const diagnostics = validateCard(card).diagnostics.filter(
      ({ code }) => code === "component_limit",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.path).toBe("$.body.elements[196].tag");
    expect(normalizeCard(card).card?.body.elements[196]).toMatchObject({
      tag: "__unsupported",
      reason: "component_limit",
      path: "$.body.elements[196]",
    });
  });

  it("traverses only locale tag lists in i18n_text_tag_list", () => {
    const tags = Array.from({ length: 200 }, (_, index) => ({
      tag: "text_tag",
      text: String(index),
    }));
    const card = {
      schema: "2.0",
      header: {
        title: { tag: "plain_text", content: "title" },
        i18n_text_tag_list: {
          zh_cn: tags,
        },
        i18n_future: {
          zh_cn: Array.from({ length: 20 }, () => ({ tag: "hr" })),
        },
      },
      body: { elements: [] },
    };
    const diagnostics = validateCard(card).diagnostics.filter(
      ({ code }) => code === "component_limit",
    );
    const normalizedHeader = normalizeCard(card).card?.header as
      | Record<string, unknown>
      | undefined;

    expect(diagnostics).toEqual([
      expect.objectContaining({
        path: "$.header.i18n_text_tag_list.zh_cn[199].tag",
      }),
    ]);
    expect(normalizedHeader?.i18n_text_tag_list).toMatchObject({
      zh_cn: expect.arrayContaining([
        expect.objectContaining({
          tag: "__unsupported",
          reason: "component_limit",
          path: "$.header.i18n_text_tag_list.zh_cn[199]",
        }),
      ]),
    });
    expect(normalizedHeader?.i18n_future).toEqual(card.header.i18n_future);
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

  it.each([
    "text", "lark_md", "options", "number", "persons", "date", "markdown",
  ])("accepts the supported table data_type %s", (dataType) => {
    const result = validateCard({
      schema: "2.0",
      body: { elements: [{
        tag: "table",
        columns: [{ name: "value", data_type: dataType }],
        rows: [{ value: "example" }],
      }] },
    });
    expect(result.diagnostics).toEqual([]);
  });
});
