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
    "diagnoses invalid enums and preserves unknown fields for %s",
    (tag, fixtures) => {
      expect(validateCard(fixtures.invalid).diagnostics.map(({ code }) => code))
        .toContain("invalid_enum");
      expect(JSON.stringify(normalizeCard(fixtures.invalid).card))
        .toContain(`future_${tag === "column" ? "column" : tag}`);
    },
  );

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
