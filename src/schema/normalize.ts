import type { NormalizedCard } from "./card";
import { CONTAINER_TAGS } from "./components";
import {
  childPath,
  type ProtocolPath,
  type ValidationResult,
} from "./diagnostics";
import { validateCard } from "./validate";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type NormalizeState = { componentCount: number };

function cloneAndNormalize(
  value: unknown,
  path: ProtocolPath,
  depth: number,
  state: NormalizeState,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      cloneAndNormalize(item, childPath(path, index), depth, state)
    );
  }
  if (!isRecord(value)) return value;

  const tag = typeof value.tag === "string" ? value.tag : undefined;
  const nextDepth = tag && CONTAINER_TAGS.has(tag) ? depth + 1 : depth;
  if (tag) {
    state.componentCount += 1;
    if (state.componentCount > 200) {
      return {
        tag: "__unsupported",
        originalTag: tag,
        reason: "component_limit",
        path,
      };
    }
    if (nextDepth > 5) {
      return {
        tag: "__unsupported",
        originalTag: tag,
        reason: "container_depth",
        path,
      };
    }
  }

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    output[key] = cloneAndNormalize(
      child,
      childPath(path, key),
      nextDepth,
      state,
    );
  }

  if (tag === "column" || tag === "form" ||
    tag === "interactive_container" || tag === "collapsible_panel") {
    output.elements ??= [];
    output.direction ??= "vertical";
  }
  if (tag === "column_set") output.columns ??= [];
  if (tag === "select_img") output.multi_select ??= false;

  return output;
}

export function normalizeCard(
  input: unknown,
): ValidationResult<NormalizedCard> {
  const validation = validateCard(input);
  if (validation.fatal || validation.card === null) {
    return { ...validation, card: null };
  }

  const cloned = cloneAndNormalize(
    validation.card,
    "$",
    0,
    { componentCount: 0 },
  ) as Record<string, unknown>;
  const rawConfig = isRecord(cloned.config) ? cloned.config : {};
  const rawBody = isRecord(cloned.body) ? cloned.body : {};
  cloned.config = {
    ...rawConfig,
    update_multi: true,
    width_mode: ["default", "compact", "fill"].includes(
      String(rawConfig.width_mode),
    )
      ? rawConfig.width_mode
      : "default",
  };
  cloned.body = {
    ...rawBody,
    direction: ["vertical", "horizontal"].includes(String(rawBody.direction))
      ? rawBody.direction
      : "vertical",
    horizontal_align: ["left", "center", "right"].includes(
      String(rawBody.horizontal_align),
    )
      ? rawBody.horizontal_align
      : "left",
    vertical_align: ["top", "center", "bottom"].includes(
      String(rawBody.vertical_align),
    )
      ? rawBody.vertical_align
      : "top",
    elements: Array.isArray(rawBody.elements) ? rawBody.elements : [],
  };

  return {
    ...validation,
    card: cloned as NormalizedCard,
  };
}
