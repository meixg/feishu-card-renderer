const PX = /^(-?\d{1,2})px$/;
const RGBA = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/;
const SPACING: Record<string, string> = {
  small: "4px", medium: "8px", large: "12px", extra_large: "16px",
};

export function safePx(value: unknown, negative = false): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = PX.exec(value);
  if (!match) return undefined;
  const number = Number(match[1]);
  return number <= 99 && number >= (negative ? -99 : 0) ? `${number}px` : undefined;
}

export function safeBox(value: unknown, negative: boolean): string | undefined {
  if (typeof value !== "string") return undefined;
  const parts = value.trim().split(/\s+/);
  return [1, 2, 4].includes(parts.length) && parts.every((part) => safePx(part, negative))
    ? parts.join(" ") : undefined;
}

export function safeSpacing(value: unknown): string | undefined {
  return typeof value === "string" ? SPACING[value] ?? safePx(value) : undefined;
}

export function safeRgba(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = RGBA.exec(value);
  if (!match) return undefined;
  return match.slice(1, 4).every((part) => Number(part) <= 255) &&
      Number(match[4]) <= 1
    ? value : undefined;
}

export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
