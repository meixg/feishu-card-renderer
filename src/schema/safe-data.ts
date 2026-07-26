export function ownDataValue(
  value: unknown,
  key: PropertyKey,
): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

export function hasOwnDataProperty(
  value: unknown,
  key: PropertyKey,
): boolean {
  if (typeof value !== "object" || value === null) return false;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor;
}

export function safeDataSnapshot(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value === "string" ||
    typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value !== "object" || depth >= 24 || seen.has(value)) {
    return undefined;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const output: unknown[] = [];
    const length = Math.min(value.length, 1000);
    for (let index = 0; index < length; index += 1) {
      const child = ownDataValue(value, index);
      output.push(safeDataSnapshot(child, depth + 1, seen));
    }
    seen.delete(value);
    return output;
  }
  const output: Record<string, unknown> = {};
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Object.keys(descriptors).slice(0, 1000)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor)) continue;
    const child = safeDataSnapshot(descriptor.value, depth + 1, seen);
    if (child !== undefined) output[key] = child;
  }
  seen.delete(value);
  return output;
}
