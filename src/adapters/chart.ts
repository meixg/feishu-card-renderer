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
const FORBIDDEN_RENDER_MODES = new Set(["html", "dom", "reactdom"]);
const RENDER_MODE_KEYS = new Set([
  "renderer",
  "renderertype",
  "renderermode",
  "rendermode",
]);

export type SafeChartSpecResult =
  | { ok: true; spec: Record<string, unknown> }
  | { ok: false; reason: "invalid" | "unsafe" | "too_complex" };
type ChartSpecFailure = Extract<SafeChartSpecResult, { ok: false }>["reason"];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizedIdentifier(value: string): string {
  return value.toLowerCase().replace(/[\s_-]/g, "");
}

function isBusinessDataPath(path: readonly string[]): boolean {
  const dataIndex = path.indexOf("data");
  const valuesIndex = path.lastIndexOf("values");
  return dataIndex >= 0 && valuesIndex > dataIndex &&
    path.length > valuesIndex + 1;
}

function isForbiddenRenderMode(
  value: string,
  path: readonly string[],
): boolean {
  if (!FORBIDDEN_RENDER_MODES.has(normalizedIdentifier(value))) return false;
  if (path.length === 1 && path[0] === "type") return true;
  const key = path.at(-1);
  return key !== undefined && !isBusinessDataPath(path) &&
    RENDER_MODE_KEYS.has(normalizedIdentifier(key));
}

export function sanitizeChartSpec(input: unknown): SafeChartSpecResult {
  let nodes = 0;
  let failure: ChartSpecFailure | undefined;

  const visit = (
    value: unknown,
    depth: number,
    path: readonly string[],
  ): unknown => {
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
      if (EXECUTABLE_STRING.test(value) ||
        isForbiddenRenderMode(value, path)) {
        failure = "unsafe";
      }
      return value;
    }
    if (Array.isArray(value)) {
      const descriptors = Object.getOwnPropertyDescriptors(value) as
        Record<string, PropertyDescriptor>;
      if (Object.getOwnPropertySymbols(value).length > 0) {
        failure = "invalid";
        return undefined;
      }
      const lengthDescriptor = descriptors.length;
      const rawLength = lengthDescriptor && "value" in lengthDescriptor
        ? lengthDescriptor.value
        : undefined;
      if (typeof rawLength !== "number" ||
        !Number.isSafeInteger(rawLength) || rawLength < 0) {
        failure = "invalid";
        return undefined;
      }
      const length = rawLength;
      const copy: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor)) {
          failure = descriptor ? "unsafe" : "invalid";
          return undefined;
        }
        const safeItem = visit(
          descriptor.value,
          depth + 1,
          [...path, String(index)],
        );
        if (failure) return undefined;
        copy.push(safeItem);
      }
      if (Object.keys(descriptors).some((key) =>
        key !== "length" &&
        (!/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= length)
      )) {
        failure = "invalid";
        return undefined;
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
      const safeValue = visit(descriptor.value, depth + 1, [...path, key]);
      if (failure) return undefined;
      copy[key] = safeValue;
    }
    return copy;
  };

  try {
    if (!isPlainRecord(input)) return { ok: false, reason: "invalid" };
    const spec = visit(input, 0, []);
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
