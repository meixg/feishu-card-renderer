const MAX_SPEC_DEPTH = 32;
const MAX_SPEC_NODES = 20_000;

const FORBIDDEN_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "html",
  "dom",
  "reactDom",
  "extensionMark",
  "customMark",
  "customLayout",
  "customAnimation",
  "beforeRender",
  "afterRender",
  "register",
  "registerFunction",
  "function",
  "functions",
  "script",
]);

const EXECUTABLE_KEY = /^(?:on.*|.*(?:callback|handler|formatter|function|script|register).*)$/i;
const EXECUTABLE_STRING = /(?:javascript\s*:|<\s*script\b|<\/\s*script\s*>)/i;

export type SafeChartSpecResult =
  | { ok: true; spec: Record<string, unknown> }
  | { ok: false; reason: "invalid" | "unsafe" | "too_complex" };
type ChartSpecFailure = Extract<SafeChartSpecResult, { ok: false }>["reason"];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeChartSpec(input: unknown): SafeChartSpecResult {
  let nodes = 0;
  let failure: ChartSpecFailure | undefined;

  const visit = (value: unknown, depth: number): unknown => {
    nodes += 1;
    if (nodes > MAX_SPEC_NODES || depth > MAX_SPEC_DEPTH) {
      failure = "too_complex";
      return undefined;
    }
    if (
      value === null ||
      typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value))
    ) return value;
    if (typeof value === "string") {
      if (EXECUTABLE_STRING.test(value)) failure = "unsafe";
      return value;
    }
    if (Array.isArray(value)) {
      const copy: unknown[] = [];
      for (const item of value) {
        const safeItem = visit(item, depth + 1);
        if (failure) return undefined;
        copy.push(safeItem);
      }
      return copy;
    }
    if (!isPlainRecord(value)) {
      failure = typeof value === "function" ? "unsafe" : "invalid";
      return undefined;
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length > 0) {
      failure = "invalid";
      return undefined;
    }
    const copy: Record<string, unknown> = Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (FORBIDDEN_KEYS.has(key) || EXECUTABLE_KEY.test(key)) {
        failure = "unsafe";
        return undefined;
      }
      if (!("value" in descriptor)) {
        failure = "unsafe";
        return undefined;
      }
      const safeValue = visit(descriptor.value, depth + 1);
      if (failure) return undefined;
      copy[key] = safeValue;
    }
    return copy;
  };

  try {
    if (!isPlainRecord(input)) return { ok: false, reason: "invalid" };
    const spec = visit(input, 0);
    if (failure) return { ok: false, reason: failure };
    return { ok: true, spec: spec as Record<string, unknown> };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export const FEISHU_CHART_TYPES = [
  "line",
  "area",
  "bar",
  "pie",
  "common",
  "funnel",
  "scatter",
  "radar",
  "linearProgress",
  "circularProgress",
  "wordCloud",
] as const;

export const FEISHU_MOBILE_CHART_LIMITATIONS = [
  "texture",
  "conical-gradient",
  "word-cloud-grid",
  "extension-mark-image-repeat",
  "svg-symbol-background",
] as const;
