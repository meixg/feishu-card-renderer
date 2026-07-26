import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

import type {
  CardAction,
  CardDiagnostic,
  CardRendererProps,
} from "../../src";
import {
  normalizeCard as normalizeFromSchema,
  validateCard as validateFromSchema,
} from "../../src/schema";

it("keeps the documented host integration aligned with public types", () => {
  const props = {
    card: { schema: "2.0" },
    locale: "zh_cn",
    colorScheme: "light",
    device: "pc",
    onAction: (action: CardAction) => void action,
    onDiagnostic: (diagnostics: readonly CardDiagnostic[]) => void diagnostics,
  } satisfies CardRendererProps;
  expect(props.card.schema).toBe("2.0");

  const guide = readFileSync("docs/integration.md", "utf8");
  expect(guide).not.toMatch(/<CardRenderer\s+strict|\bstrict 模式/);
  expect(guide).toContain('`"schema": "2.0"`');
  expect(validateFromSchema({ schema: "2.0" }).fatal).toBe(false);
  expect(normalizeFromSchema({ schema: "2.0" }).card?.schema).toBe("2.0");

  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    exports: Record<string, { types?: string; import?: string }>;
  };
  expect(manifest.exports["./schema"]).toEqual({
    types: "./dist/schema/index.d.ts",
    import: "./dist/schema.js",
  });
});
