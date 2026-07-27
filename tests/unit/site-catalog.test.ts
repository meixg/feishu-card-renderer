import { describe, expect, it } from "vitest";

import { catalog } from "../../site/src/catalog";
import { CARD_COMPONENT_TAGS } from "../../src/schema/components";
import { normalizeCard } from "../../src/schema/normalize";

describe("project site component catalog", () => {
  it("covers header and every registered runtime tag exactly once", () => {
    expect(catalog).toHaveLength(CARD_COMPONENT_TAGS.length + 1);
    expect(catalog.map((item) => item.tag)).toEqual([
      "header",
      ...CARD_COMPONENT_TAGS,
    ]);
    expect(new Set(catalog.map((item) => item.id)).size).toBe(catalog.length);
  });

  it.each(catalog)("$tag demo is a valid JSON 2.0 card", ({ card }) => {
    const result = normalizeCard(card);
    expect(result.fatal).toBe(false);
    expect(result.diagnostics).toEqual([]);
  });
});
