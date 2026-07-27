import { describe, expect, it } from "vitest";

import {
  parsePlaygroundJson,
  PLAYGROUND_INPUT_LIMIT,
  playgroundExampleJson,
} from "../../site/src/playground-data";
import { normalizeCard } from "../../src/schema/normalize";

describe("project site playground data", () => {
  it("ships a valid JSON 2.0 example", () => {
    const parsed = parsePlaygroundJson(playgroundExampleJson);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(normalizeCard(parsed.value)).toMatchObject({
      fatal: false,
      diagnostics: [],
    });
  });

  it("reports empty and malformed input without echoing it", () => {
    expect(parsePlaygroundJson("")).toEqual({
      ok: false,
      error: "请输入飞书卡片 JSON 2.0",
    });
    const malformed = parsePlaygroundJson('{"secret":"do-not-echo",}');
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.error).toContain("JSON 语法错误");
    expect(malformed.error).not.toContain("do-not-echo");
  });

  it("bounds input before parsing", () => {
    const result = parsePlaygroundJson(" ".repeat(PLAYGROUND_INPUT_LIMIT + 1));
    expect(result).toEqual({
      ok: false,
      error: "JSON 超过 200,000 字符上限",
    });
  });
});
