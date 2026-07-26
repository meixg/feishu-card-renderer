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
    if (isValidElementId(candidate.element_id)) {
      counts.set(
        candidate.element_id,
        (counts.get(candidate.element_id) ?? 0) + 1,
      );
    }
    Object.values(candidate).forEach(visit);
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
  if (isRecord(element) && isValidElementId(element.element_id) &&
    uniqueElementIds.has(element.element_id)) {
    return element.element_id;
  }
  return path;
}
