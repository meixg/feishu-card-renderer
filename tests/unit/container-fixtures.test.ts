import { describe, expect, it } from "vitest";

import { normalizeCard, validateCard } from "../../src";
import {
  completeContainerCard,
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

  it("keeps form/table/chart nesting conservative", () => {
    const codes = validateCard(invalidContainerCard).diagnostics.map(
      ({ code }) => code,
    );
    expect(codes).toEqual(expect.arrayContaining([
      "root_only_component",
      "forbidden_child",
      "form_submit_required",
      "form_chart_forbidden",
    ]));
  });
});
