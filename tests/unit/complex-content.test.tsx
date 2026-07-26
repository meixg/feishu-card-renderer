import { expect, it } from "vitest";

import { normalizeCard, validateCard } from "../../src";
import {
  invalidComplexContentCard,
  minimalComplexContentCard,
} from "../../src/fixtures/complex-content";
import { renderCardToString } from "../utils/ssr";

it("normalizes complex-content defaults without mutating input", () => {
  const input = structuredClone(minimalComplexContentCard);
  const before = structuredClone(input);
  const result = normalizeCard(input);
  expect(input).toEqual(before);
  expect(result.card?.body.elements).toEqual(expect.arrayContaining([
    expect.objectContaining({ tag: "img_combination", combination_mode: "double" }),
    expect.objectContaining({ tag: "person", size: "medium",
      show_avatar: true, show_name: true }),
    expect.objectContaining({ tag: "table", page_size: 5, row_height: "medium" }),
  ]));
});

it("diagnoses invalid complex enums and table component data", () => {
  const codes = validateCard(invalidComplexContentCard).diagnostics.map((item) => item.code);
  expect(codes).toEqual(expect.arrayContaining(["invalid_enum", "forbidden_child"]));
});

it("SSR emits stable placeholders and semantic table without resource values", () => {
  const html = renderCardToString(minimalComplexContentCard);
  expect(html).toContain("<table");
  expect(html).toContain("data-state=\"unavailable\"");
  expect(html).not.toContain(">person-a<");
  expect(html).not.toContain(">one<");
});
