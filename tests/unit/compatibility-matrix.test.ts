import { describe, expect, it } from "vitest";

import {
  CARD_COMPONENT_TAGS,
  normalizeCard,
  validateCard,
} from "../../src";
import {
  cardInNestingContext,
  compatibilityFixturesByTag,
  findFixtureTarget,
} from "../../src/fixtures/compatibility-matrix";

describe("1.0 executable per-tag compatibility matrix", () => {
  it("has one deliberate contract for every registered runtime tag", () => {
    expect(Object.keys(compatibilityFixturesByTag)).toEqual(
      [...CARD_COMPONENT_TAGS],
    );
  });

  it.each(CARD_COMPONENT_TAGS)("%s: minimal is legal", (tag) => {
    const fixture = compatibilityFixturesByTag[tag];
    expect(validateCard(fixture.minimal).diagnostics).toEqual([]);
    expect(findFixtureTarget(fixture.minimal, tag)?.tag).toBe(tag);
  });

  it.each(CARD_COMPONENT_TAGS)(
    "%s: complete fixture owns every declared supported field",
    (tag) => {
      const fixture = compatibilityFixturesByTag[tag];
      const target = findFixtureTarget(fixture.complete, tag);
      expect(target).toBeDefined();
      expect(fixture.completeFields.length).toBeGreaterThan(0);
      for (const field of fixture.completeFields) {
        expect(
          Object.prototype.hasOwnProperty.call(target, field),
          `${tag}.${field}`,
        ).toBe(true);
      }
      expect(validateCard(fixture.complete).diagnostics).toEqual([]);
      const normalized = normalizeCard(fixture.complete);
      const normalizedTarget = findFixtureTarget(normalized.card, tag);
      for (const field of fixture.completeFields) {
        expect(normalizedTarget?.[field], `${tag}.${field}`).toEqual(
          target?.[field],
        );
      }
    },
  );

  it.each(CARD_COMPONENT_TAGS)(
    "%s: defaults normalize to its explicit tag contract",
    (tag) => {
      const fixture = compatibilityFixturesByTag[tag];
      const result = normalizeCard(fixture.defaults);
      expect(result.fatal).toBe(false);
      const target = findFixtureTarget(result.card, tag);
      expect(target).toMatchObject(fixture.defaultValues);
    },
  );

  it.each(CARD_COMPONENT_TAGS)(
    "%s: invalid fields follow diagnostics and forward-compatible retention",
    (tag) => {
      const fixture = compatibilityFixturesByTag[tag];
      const validation = validateCard(fixture.invalid);
      expect(validation.fatal).toBe(false);
      const codes = validation.diagnostics.map(({ code }) => code);
      for (const code of fixture.expectedInvalidCodes) {
        expect(codes, `${tag}:${code}`).toContain(code);
      }
      expect(fixture.invalidFields.length).toBeGreaterThan(0);

      const normalized = normalizeCard(fixture.invalid);
      const target = findFixtureTarget(normalized.card, tag);
      expect(target?.[fixture.preservedUnknownField]).toEqual({
        preserved: true,
      });
    },
  );

  it.each(CARD_COMPONENT_TAGS)(
    "%s: allowed nesting contexts remain legal",
    (tag) => {
      const fixture = compatibilityFixturesByTag[tag];
      for (const context of fixture.nesting.allowed) {
        const result = validateCard(cardInNestingContext(tag, context));
        expect(
          result.diagnostics.map(({ code }) => code),
          `${tag} in ${context}`,
        ).toEqual([]);
      }
    },
  );

  it.each(CARD_COMPONENT_TAGS)(
    "%s: forbidden nesting contexts emit the declared diagnostic",
    (tag) => {
      const fixture = compatibilityFixturesByTag[tag];
      for (const [context, code] of Object.entries(fixture.nesting.forbidden)) {
        const result = validateCard(cardInNestingContext(
          tag,
          context as keyof typeof fixture.nesting.forbidden,
        ));
        expect(
          result.diagnostics.map((diagnostic) => diagnostic.code),
          `${tag} in ${context}`,
        ).toContain(code);
      }
    },
  );

  it.each(CARD_COMPONENT_TAGS)(
    "%s: resource applicability is explicit",
    (tag) => {
      const resource = compatibilityFixturesByTag[tag].resource;
      if (resource.kind === "none") {
        expect(resource.modes).toEqual([]);
      } else {
        expect(resource.modes).toEqual([
          "missing", "resolved", "rejected", "aborted",
        ]);
      }
    },
  );
});
