import { safeBox, safePx, safeSpacing } from "../styles/safe";

type StyleParser = (value: unknown) => unknown;

const STYLE_FIELDS_BY_TAG: Readonly<
  Record<string, Readonly<Record<string, StyleParser>>>
> = {
  column_set: {
    horizontal_spacing: safeSpacing,
  },
  column: {
    horizontal_spacing: safeSpacing,
    vertical_spacing: safeSpacing,
    padding: (value) => safeBox(value, false),
  },
  form: {
    horizontal_spacing: safeSpacing,
    vertical_spacing: safeSpacing,
  },
  interactive_container: {
    horizontal_spacing: safeSpacing,
    vertical_spacing: safeSpacing,
    padding: (value) => safeBox(value, false),
    corner_radius: safePx,
  },
  div: {
    margin: (value) => safeBox(value, true),
  },
  img: {
    margin: (value) => safeBox(value, true),
    corner_radius: safePx,
  },
  img_combination: {
    corner_radius: safePx,
  },
  hr: {
    margin: (value) => safeBox(value, true),
  },
};

export function invalidStyleFields(
  tag: string | undefined,
  value: Readonly<Record<string, unknown>>,
): readonly string[] {
  if (!tag) return [];
  const policy = STYLE_FIELDS_BY_TAG[tag];
  if (!policy) return [];
  return Object.entries(policy)
    .filter(([field, parse]) =>
      value[field] !== undefined && parse(value[field]) === undefined
    )
    .map(([field]) => field);
}
