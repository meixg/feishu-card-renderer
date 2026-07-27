const ELEMENT_ID = /^[A-Za-z][A-Za-z0-9_]{0,19}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidElementId(value: unknown): value is string {
  return typeof value === "string" && ELEMENT_ID.test(value);
}

export function collectUniqueElementIds(value: unknown): ReadonlySet<string> {
  const counts = new Map<string, number>();
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (!isRecord(candidate)) return;
    const descriptors = Object.getOwnPropertyDescriptors(candidate);
    const elementId = descriptors.element_id;
    if (elementId && "value" in elementId &&
      isValidElementId(elementId.value)) {
      counts.set(
        elementId.value,
        (counts.get(elementId.value) ?? 0) + 1,
      );
    }
    const tag = descriptors.tag && "value" in descriptors.tag
      ? descriptors.tag.value
      : undefined;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor)) continue;
      if (tag === "chart" && key === "chart_spec") continue;
      visit(descriptor.value);
    }
  };
  visit(value);
  return new Set(
    [...counts].filter(([, count]) => count === 1).map(([id]) => id),
  );
}

export function keyForElement(
  element: unknown,
  path: string,
  uniqueElementIds: ReadonlySet<string>,
): string {
  if (!isRecord(element)) return path;
  const descriptor = Object.getOwnPropertyDescriptor(element, "element_id");
  const elementId = descriptor && "value" in descriptor
    ? descriptor.value
    : undefined;
  if (isValidElementId(elementId) && uniqueElementIds.has(elementId)) {
    return elementId;
  }
  return path;
}
