import { describe, expect, it } from "vitest";

import { normalizeCard, validateCard } from "../../src";
import {
  completeContainerCard,
  containerFixtureMatrix,
  defaultContainerCard,
  invalidContainerCard,
  minimalContainerCard,
} from "../../src/fixtures/container-cards";

describe("container fixtures", () => {
  it.each([
    ["minimal", minimalContainerCard],
    ["complete", completeContainerCard],
    ["default", defaultContainerCard],
  ])("accepts the %s fixture", (_, card) => {
    expect(validateCard(card).diagnostics).toEqual([]);
    expect(normalizeCard(card).card).not.toBe(card);
  });

  it.each(Object.entries(containerFixtureMatrix))(
    "covers minimal, complete, and default fixtures for %s",
    (tag, fixtures) => {
      for (const variant of ["minimal", "complete", "default"] as const) {
        expect(
          validateCard(fixtures[variant]).diagnostics,
          `${tag}:${variant}`,
        ).toEqual([]);
      }

      const normalized = normalizeCard(fixtures.default).card;
      expect(normalized, tag).not.toBeNull();
      const root = normalized?.body.elements[0] as Record<string, unknown>;
      if (tag === "column_set") {
        expect(root.columns).toHaveLength(1);
      } else if (tag === "column") {
        const column = (root.columns as Array<Record<string, unknown>>)[0];
        expect(column.direction).toBe("vertical");
      } else if (tag === "collapsible_panel") {
        expect(root).toMatchObject({ direction: "vertical", expanded: false });
      } else {
        expect(root.direction).toBe("vertical");
      }
    },
  );

  it.each(Object.entries(containerFixtureMatrix))(
    "diagnoses invalid enums/lengths and preserves unknown fields for %s",
    (tag, fixtures) => {
      const codes = validateCard(fixtures.invalid).diagnostics.map(
        ({ code }) => code,
      );
      expect(codes).toEqual(expect.arrayContaining([
        "invalid_enum",
        "invalid_style",
      ]));
      const normalized = JSON.stringify(normalizeCard(fixtures.invalid).card);
      expect(normalized)
        .toContain(`future_${tag === "column" ? "column" : tag}`);
      expect(normalized).not.toContain("100px");
    },
  );

  it("limits position validation to collapsible panel headers", () => {
    const result = validateCard({
      schema: "2.0",
      body: {
        elements: [
          { tag: "chart", chart_spec: { position: "inside" } },
          {
            tag: "interactive_container",
            future_extension: { position: "inside" },
            elements: [],
          },
          {
            tag: "collapsible_panel",
            header: { position: "sideways" },
            elements: [],
          },
        ],
      },
    });
    expect(result.diagnostics.filter(({ code }) => code === "invalid_enum"))
      .toEqual([
        expect.objectContaining({
          path: "$.body.elements[2].header.position",
        }),
      ]);
  });

  it("preserves chart and extension style-shaped data during normalization", () => {
    const card = {
      schema: "2.0",
      body: {
        elements: [
          {
            tag: "chart",
            height: "1000px",
            margin: "1px; color:red",
            chart_spec: {
              series: {
                imageLikeData: { tag: "img", margin: [1, 2, 3, 4] },
                personLikeData: { tag: "person" },
              },
            },
            future_extension: {
              nested: {
                tag: "interactive_container",
                padding: ["business", "data"],
                child: { tag: "person" },
              },
            },
          },
          { tag: "img", img_key: "real", margin: ["invalid"] },
          {
            tag: "person",
            user_id: "real",
          },
        ],
      },
    };
    const original = structuredClone(card);
    const normalized = normalizeCard(card).card;
    const normalizedChart = normalized?.body.elements[0] as
      | Record<string, unknown>
      | undefined;

    expect(card).toEqual(original);
    expect(normalizedChart?.chart_spec)
      .toEqual(card.body.elements[0].chart_spec);
    expect(normalizedChart?.future_extension)
      .toEqual(card.body.elements[0].future_extension);
    expect(normalizedChart).not.toHaveProperty("height");
    expect(normalizedChart).not.toHaveProperty("margin");
    expect(normalized?.body.elements[1]).not.toHaveProperty("margin");
    expect(normalized?.body.elements[2]).toMatchObject({
      size: "medium",
      show_avatar: true,
      show_name: true,
    });
  });

  it("diagnoses and normalizes collapsible header enums", () => {
    const card = {
      schema: "2.0",
      body: {
        elements: [{
          tag: "collapsible_panel",
          header: {
            position: "sideways",
            icon_position: "left injected-class",
          },
          elements: [],
        }],
      },
    };
    const result = normalizeCard(card);

    expect(result.diagnostics.filter(({ code }) => code === "invalid_enum"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: "$.body.elements[0].header.position",
        }),
        expect.objectContaining({
          path: "$.body.elements[0].header.icon_position",
        }),
      ]));
    expect(result.card?.body.elements[0]).toMatchObject({
      header: { position: "top", icon_position: "left" },
    });
  });

  it("defaults a configured collapsible border to a 5px radius", () => {
    const result = normalizeCard({
      schema: "2.0",
      body: {
        elements: [
          { tag: "collapsible_panel", border: { color: "grey" }, elements: [] },
          { tag: "collapsible_panel", elements: [] },
        ],
      },
    });

    expect(result.card?.body.elements[0]).toMatchObject({
      border: { color: "grey", corner_radius: "5px" },
    });
    expect(result.card?.body.elements[1]).not.toHaveProperty("border");
  });

  it("keeps form/table/chart nesting conservative", () => {
    const result = validateCard(invalidContainerCard);
    const codes = result.diagnostics.map(
      ({ code }) => code,
    );
    expect(codes).toEqual(expect.arrayContaining([
      "root_only_component",
      "forbidden_child",
      "form_submit_required",
      "form_chart_forbidden",
    ]));
    const normalized = normalizeCard(invalidContainerCard).card;
    expect(normalized?.body.elements[0]).toMatchObject({
      tag: "column_set",
      columns: [{
        tag: "column",
        elements: [{
          tag: "__unsupported",
          originalTag: "table",
          reason: "invalid_nesting",
          path: "$.body.elements[0].columns[0].elements[0]",
        }],
      }],
    });
    expect(normalized?.body.elements.slice(1).map((element) =>
      "elements" in element && Array.isArray(element.elements)
        ? element.elements[0]
        : undefined)).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: "__unsupported", originalTag: "form" }),
      expect.objectContaining({ tag: "__unsupported", originalTag: "chart" }),
    ]));
  });
});
