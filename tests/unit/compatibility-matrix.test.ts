import { describe, expect, it } from "vitest";

import { CARD_COMPONENT_TAGS, validateCard } from "../../src";
import {
  compatibilityFixturesByTag,
  FIXTURE_SCENARIOS,
  fixtureCardForTag,
} from "../../src/fixtures/compatibility-matrix";

describe("1.0 tag compatibility fixture index", () => {
  const containsTag = (value: unknown, tag: string): boolean => {
    if (!value || typeof value !== "object") return false;
    if (!Array.isArray(value) && (value as { tag?: unknown }).tag === tag) {
      return true;
    }
    return Object.values(value).some((child) => containsTag(child, tag));
  };

  it("indexes every registered runtime tag and every required fixture class", () => {
    expect(Object.keys(compatibilityFixturesByTag)).toEqual(
      [...CARD_COMPONENT_TAGS],
    );
    for (const tag of CARD_COMPONENT_TAGS) {
      const fixture = compatibilityFixturesByTag[tag];
      expect(fixture.tag).toBe(tag);
      expect(Object.keys(fixture.scenarios)).toEqual([...FIXTURE_SCENARIOS]);
      expect(Object.values(fixture.scenarios).every((card) =>
        card.schema === "2.0")).toBe(true);
      expect(fixture.resourceModes.length).toBeGreaterThan(0);
    }
  });

  it.each(CARD_COMPONENT_TAGS)("keeps the %s minimal fixture protocol-valid", (tag) => {
    expect(validateCard(fixtureCardForTag(tag)).diagnostics).toEqual([]);
  });

  it.each(CARD_COMPONENT_TAGS)(
    "keeps %s present in its complete, default, nesting, and resource fixtures",
    (tag) => {
      const scenarios = compatibilityFixturesByTag[tag].scenarios;
      for (const name of ["complete", "defaults", "nesting", "resources"] as const) {
        expect(containsTag(scenarios[name], tag), `${tag}.${name}`).toBe(true);
      }
    },
  );

  it.each(CARD_COMPONENT_TAGS)("makes the %s invalid fixture recoverable", (tag) => {
    const result = validateCard(
      compatibilityFixturesByTag[tag].scenarios.invalid,
    );
    expect(result.fatal).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "invalid_element_id" }),
    ]));
  });
});
