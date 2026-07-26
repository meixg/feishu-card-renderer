import type { NormalizedCard } from "./card";
import { CONTAINER_TAGS, KNOWN_TAGS } from "./components";
import {
  childPath,
  type ProtocolPath,
  type ValidationResult,
} from "./diagnostics";
import { invalidStyleFields } from "./style-policy";
import { validateCard } from "./validate";
import { safePx } from "../styles/safe";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type NormalizeState = { componentCount: number };

type NestingContext = {
  directBody: boolean;
  inForm: boolean;
};

function cloneOpaque(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneOpaque);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, cloneOpaque(child)]),
  );
}

function cloneTaggedField(
  output: Record<string, unknown>,
  field: string,
  path: ProtocolPath,
  depth: number,
  state: NormalizeState,
): void {
  if (isRecord(output[field]) && typeof output[field].tag === "string") {
    output[field] = cloneAndNormalizeComponent(
      output[field],
      childPath(path, field),
      depth,
      state,
    );
  }
}

function cloneAndNormalizeComponent(
  value: unknown,
  path: ProtocolPath,
  depth: number,
  state: NormalizeState,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      cloneAndNormalizeComponent(item, childPath(path, index), depth, state)
    );
  }
  if (!isRecord(value)) return cloneOpaque(value);

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

  const output = cloneOpaque(value) as Record<string, unknown>;
  const collection = tag === "column_set"
    ? "columns"
    : ["column", "form", "interactive_container", "collapsible_panel"]
        .includes(String(tag))
    ? "elements"
    : undefined;
  if (collection && Array.isArray(output[collection])) {
    output[collection] = output[collection].map((child, index) =>
      cloneAndNormalizeComponent(
        child,
        childPath(childPath(path, collection), index),
        nextDepth,
        state,
      )
    );
  }
  if (tag && KNOWN_TAGS.has(tag)) {
    for (const field of ["text", "alt", "title", "icon"]) {
      cloneTaggedField(output, field, path, nextDepth, state);
    }
    if (Array.isArray(output.text_tag_list)) {
      output.text_tag_list = output.text_tag_list.map((child, index) =>
        cloneAndNormalizeComponent(
          child,
          childPath(childPath(path, "text_tag_list"), index),
          nextDepth,
          state,
        )
      );
    }
  }
  if (tag === "collapsible_panel" && isRecord(output.header)) {
    cloneTaggedField(
      output.header,
      "title",
      childPath(path, "header"),
      nextDepth,
      state,
    );
  }
  if (tag === "img_combination" && Array.isArray(output.img_list)) {
    output.img_list = output.img_list.map((image, index) => {
      if (!isRecord(image)) return image;
      const clonedImage = cloneOpaque(image) as Record<string, unknown>;
      cloneTaggedField(
        clonedImage,
        "alt",
        childPath(childPath(path, "img_list"), index),
        nextDepth,
        state,
      );
      return clonedImage;
    });
  }

  if (tag === "column" || tag === "form" ||
    tag === "interactive_container" || tag === "collapsible_panel") {
    output.elements ??= [];
    output.direction ??= "vertical";
  }
  if (tag === "collapsible_panel") {
    output.expanded ??= false;
    const header = isRecord(output.header) ? { ...output.header } : {};
    header.position = ["top", "bottom"].includes(String(header.position))
      ? header.position
      : "top";
    header.icon_position = ["left", "right"].includes(
        String(header.icon_position),
      )
      ? header.icon_position
      : "left";
    output.header = header;
  }
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
  for (const field of invalidStyleFields(tag, output)) {
    delete output[field];
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

  const state = { componentCount: 0 };
  const cloned = cloneOpaque(validation.card) as Record<string, unknown>;
  if (isRecord(cloned.header)) {
    for (const field of ["title", "subtitle"]) {
      cloneTaggedField(cloned.header, field, "$.header", 0, state);
    }
  }
  if (isRecord(cloned.body) && Array.isArray(cloned.body.elements)) {
    cloned.body.elements = cloned.body.elements.map((element, index) =>
      cloneAndNormalizeComponent(
        element,
        childPath("$.body.elements", index),
        0,
        state,
      )
    );
  }
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
