import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

import type {
  CardAction,
  CardDiagnostic,
  CardJsonV2,
  CardRendererProps,
} from "../../src";
import {
  normalizeCard as normalizeFromSchema,
  validateCard as validateFromSchema,
} from "../../src/schema";

it("keeps the documented host integration aligned with public types", () => {
  const typedCard = {
    schema: "2.0",
    body: { elements: [] },
  } satisfies CardJsonV2;
  const props = {
    card: typedCard,
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
  expect(guide).toContain("每张成功渲染的卡片会在自己的 `.fcr-root` 内输出一个稳定 portal host");
  expect(guide).toContain("宿主不需要安装、扫描或配置 Tailwind");
  expect(validateFromSchema({ schema: "2.0" }).fatal).toBe(false);
  expect(normalizeFromSchema({ schema: "2.0" }).card?.schema).toBe("2.0");

  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    exports: Record<string, { types?: string; import?: string }>;
    peerDependencies: Record<string, string>;
  };
  expect(manifest.exports["./schema"]).toEqual({
    types: "./dist/schema/index.d.ts",
    import: "./dist/schema.js",
  });
  expect(manifest.peerDependencies).toMatchObject({
    react: ">=18.2.0 <20",
    "react-dom": ">=18.2.0 <20",
  });
  expect(manifest.dependencies).toMatchObject({
    "@base-ui/react": "^1.6.0",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    "react-day-picker": "^9.7.0",
    "tailwind-merge": "^3.6.0",
  });
  expect(manifest.dependencies).not.toHaveProperty("tailwindcss");
  expect(manifest.devDependencies).toMatchObject({
    "@tailwindcss/postcss": "^4.1.0",
    tailwindcss: "^4.1.0",
  });
});
