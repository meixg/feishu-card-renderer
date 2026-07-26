import type { CardAction, ActionSource } from "../types";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function serializableValue(value: unknown, depth = 0,
  seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === "string" ||
    typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (depth >= 12 || typeof value !== "object") return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item) =>
      serializableValue(item, depth + 1, seen) ?? null);
  }
  const output: RecordValue = {};
  for (const [key, child] of Object.entries(value).slice(0, 200)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const safe = serializableValue(child, depth + 1, seen);
    if (safe !== undefined) output[key] = safe;
  }
  return output;
}

export function sourceFor(element: RecordValue, path: string): ActionSource {
  return {
    tag: String(element.tag),
    ...(typeof element.element_id === "string" ? { elementId: element.element_id } : {}),
    ...(typeof element.name === "string" ? { name: element.name } : {}),
    path,
  };
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2048 ||
      value === "lark://msgcard/unsupported_action") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch { return undefined; }
}

export function actionsFor(
  element: RecordValue,
  path: string,
  extra: Partial<Extract<CardAction, { type: "callback" }>> = {},
  behaviorOverride?: unknown,
): CardAction[] {
  const source = sourceFor(element, path);
  const behaviors = behaviorOverride === undefined
    ? (Array.isArray(element.behaviors) ? element.behaviors : [])
    : [behaviorOverride];
  const actions: CardAction[] = [];
  for (const candidate of behaviors) {
    if (!isRecord(candidate)) continue;
    if (candidate.type === "callback") {
      actions.push({ type: "callback", source,
        ...(candidate.value !== undefined
          ? { value: serializableValue(candidate.value) }
          : element.value !== undefined
            ? { value: serializableValue(element.value) } : {}), ...extra });
    }
    if (candidate.type === "open_url") {
      const url = safeUrl(candidate.pc_url) ?? safeUrl(candidate.default_url) ??
        safeUrl(candidate.url);
      if (url) actions.push({ type: "open_url", source, url });
    }
  }
  if (actions.length === 0 && element.value !== undefined) {
    actions.push({ type: "callback", source,
      value: serializableValue(element.value), ...extra });
  }
  return actions;
}

export const browserTimezone = (): string | undefined => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined; }
  catch { return undefined; }
};
