import type { CardAction, ActionSource } from "../types";
import { hasOwnDataProperty, ownDataValue } from "../schema/safe-data";

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
    const output: unknown[] = [];
    for (let index = 0; index < Math.min(value.length, 200); index += 1) {
      output.push(
        serializableValue(ownDataValue(value, index), depth + 1, seen) ?? null,
      );
    }
    return output;
  }
  const output: RecordValue = {};
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Object.keys(descriptors).slice(0, 200)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor)) continue;
    const safe = serializableValue(descriptor.value, depth + 1, seen);
    if (safe !== undefined) output[key] = safe;
  }
  return output;
}

export function sourceFor(element: RecordValue, path: string): ActionSource {
  const tag = ownDataValue(element, "tag");
  const elementId = ownDataValue(element, "element_id");
  const name = ownDataValue(element, "name");
  return {
    tag: typeof tag === "string" ? tag : "",
    ...(typeof elementId === "string" ? { elementId } : {}),
    ...(typeof name === "string" ? { name } : {}),
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
  const rawBehaviors = ownDataValue(element, "behaviors");
  const behaviors = behaviorOverride === undefined
    ? (Array.isArray(rawBehaviors) ? rawBehaviors : [])
    : [behaviorOverride];
  const elementValue = ownDataValue(element, "value");
  const actions: CardAction[] = [];
  for (const candidate of behaviors) {
    if (!isRecord(candidate)) continue;
    const type = ownDataValue(candidate, "type");
    const candidateValue = ownDataValue(candidate, "value");
    if (type === "callback") {
      actions.push({ type: "callback", source,
        ...(candidateValue !== undefined
          ? { value: serializableValue(candidateValue) }
          : elementValue !== undefined
            ? { value: serializableValue(elementValue) } : {}), ...extra });
    }
    if (type === "open_url") {
      const pcUrl = ownDataValue(candidate, "pc_url");
      const hasPcUrl = hasOwnDataProperty(candidate, "pc_url");
      const url = hasPcUrl
        ? safeUrl(pcUrl)
        : safeUrl(ownDataValue(candidate, "default_url")) ??
          safeUrl(ownDataValue(candidate, "url"));
      if (url) actions.push({ type: "open_url", source, url });
    }
  }
  if (actions.length === 0 && elementValue !== undefined) {
    actions.push({ type: "callback", source,
      value: serializableValue(elementValue), ...extra });
  }
  return actions;
}

export const browserTimezone = (): string | undefined => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined; }
  catch { return undefined; }
};
