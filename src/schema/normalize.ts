import type { NormalizedCard } from "./card";
import { CONTAINER_TAGS } from "./components";
import {
  childPath,
  type ProtocolPath,
  type ValidationResult,
} from "./diagnostics";
import { validateCard } from "./validate";
import { safeBox, safePx, safeSpacing } from "../styles/safe";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type NormalizeState = { componentCount: number };

type NestingContext = {
  directBody: boolean;
  inForm: boolean;
};

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
  if (tag === "collapsible_panel") output.expanded ??= false;
  if (tag === "column_set") output.columns ??= [];
  if (tag === "select_img") output.multi_select ??= false;
  if (tag === "img_combination") output.combination_mode ??= "double";
  if (tag === "person" || tag === "person_list") {
    output.size ??= "medium";
    output.show_avatar ??= true;
    output.show_name ??= true;
  }
  if (tag === "table") {
    output.columns ??= [];
    output.rows ??= [];
    output.page_size = Number.isInteger(output.page_size) &&
      Number(output.page_size) >= 1 && Number(output.page_size) <= 10
      ? output.page_size : 5;
    output.row_height = ["low", "medium", "high"].includes(String(output.row_height))
      ? output.row_height : "medium";
  }
  const styleFields = [
    ["padding", () => safeBox(output.padding, false)],
    ["margin", () => safeBox(output.margin, true)],
    ["horizontal_spacing", () => safeSpacing(output.horizontal_spacing)],
    ["vertical_spacing", () => safeSpacing(output.vertical_spacing)],
    ["corner_radius", () => safePx(output.corner_radius)],
  ] as const;
  for (const [field, parse] of styleFields) {
    if (output[field] !== undefined && parse() === undefined) {
      delete output[field];
    }
  }
  if (tag === "collapsible_panel" && isRecord(output.border) &&
    output.border.corner_radius !== undefined &&
    safePx(output.border.corner_radius) === undefined) {
    const border = { ...output.border };
    delete border.corner_radius;
    output.border = border;
  }

  return output;
}

function isInvalidNesting(
  tag: string,
  context: NestingContext,
): boolean {
  if ((tag === "form" || tag === "table") && !context.directBody) return true;
  if (context.inForm && tag === "chart") return true;
  return false;
}

function replaceInvalidNesting(
  value: unknown,
  path: ProtocolPath,
  context: NestingContext,
): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((candidate, index) => {
    const candidatePath = childPath(path, index);
    if (!isRecord(candidate) || typeof candidate.tag !== "string") {
      return candidate;
    }
    const tag = candidate.tag;
    if (isInvalidNesting(tag, context)) {
      return {
        tag: "__unsupported",
        originalTag: tag,
        reason: "invalid_nesting",
        path: candidatePath,
      };
    }

    if (tag === "column_set" && Array.isArray(candidate.columns)) {
      candidate.columns = replaceInvalidNesting(
        candidate.columns,
        childPath(candidatePath, "columns"),
        { directBody: false, inForm: context.inForm },
      );
    } else if (
      ["column", "form", "interactive_container", "collapsible_panel"]
        .includes(tag) &&
      Array.isArray(candidate.elements)
    ) {
      candidate.elements = replaceInvalidNesting(
        candidate.elements,
        childPath(candidatePath, "elements"),
        {
          directBody: false,
          inForm: context.inForm || tag === "form",
        },
      );
    }
    return candidate;
  });
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
  const normalizedElements = replaceInvalidNesting(
    Array.isArray(rawBody.elements) ? rawBody.elements : [],
    "$.body.elements",
    { directBody: true, inForm: false },
  );
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
    elements: normalizedElements,
  };

  return {
    ...validation,
    card: cloned as NormalizedCard,
  };
}
