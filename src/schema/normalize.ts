import type { NormalizedCard } from "./card";
import { CONTAINER_TAGS } from "./components";
import {
  childPath,
  type ProtocolPath,
  type ValidationResult,
} from "./diagnostics";
import { invalidStyleFields } from "./style-policy";
import {
  componentChildSlots,
  headerChildSlots,
  type ProtocolChildSlot,
} from "./traversal-policy";
import { validateCard } from "./validate";
import { safePx } from "../styles/safe";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type NormalizeState = {
  componentCount: number;
  textSizes: ReadonlySet<string>;
};

type NestingContext = {
  directBody: boolean;
  inForm: boolean;
};

function cloneOpaque(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const output: object = Array.isArray(value) ? [] : Object.create(
    Object.getPrototypeOf(value) === null ? null : Object.prototype,
  );
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if ("value" in descriptor) {
      Object.defineProperty(output, key, {
        value: cloneOpaque(descriptor.value),
        enumerable: descriptor.enumerable,
        writable: true,
        configurable: !(Array.isArray(value) && key === "length"),
      });
    } else {
      Object.defineProperty(output, key, descriptor);
    }
  }
  return output;
}

function normalizeSlots(
  slots: readonly ProtocolChildSlot[],
  path: ProtocolPath,
  depth: number,
  state: NormalizeState,
): void {
  for (const slot of slots) {
    const childProtocolPath = slot.path.reduce<ProtocolPath>(
      (current, segment) => childPath(current, segment),
      path,
    );
    slot.replace(cloneAndNormalizeComponent(
      slot.value,
      childProtocolPath,
      depth,
      state,
    ));
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
  normalizeSlots(componentChildSlots(output), path, nextDepth, state);

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
  if (tag === "markdown") {
    output.content = typeof output.content === "string" ? output.content : "";
    output.text_align = ["left", "center", "right"].includes(
      String(output.text_align),
    ) ? output.text_align : "left";
    output.text_size = typeof output.text_size === "string" &&
      state.textSizes.has(output.text_size) ? output.text_size : "normal";
    if (!isRecord(output.icon) ||
      !["standard_icon", "custom_icon"].includes(String(output.icon.tag)) ||
      (output.icon.tag === "standard_icon" &&
        typeof output.icon.token !== "string") ||
      (output.icon.tag === "custom_icon" &&
        typeof output.icon.img_key !== "string")) {
      delete output.icon;
    }
  }
  if (tag === "select_img") output.multi_select ??= false;
  if (tag === "input") {
    output.default_value = typeof output.default_value === "string"
      ? output.default_value : "";
    output.input_type = ["text", "multiline_text", "password"].includes(
      String(output.input_type),
    ) ? output.input_type : "text";
    output.max_length = Number.isInteger(output.max_length) &&
      Number(output.max_length) >= 1 && Number(output.max_length) <= 1000
      ? output.max_length : 1000;
  }
  if (["input", "button", "overflow", "select_static",
    "multi_select_static", "select_person", "multi_select_person",
    "date_picker", "picker_time", "picker_datetime", "select_img",
    "checker"].includes(String(tag))) {
    output.disabled = output.disabled === true;
    output.required = output.required === true;
    for (const field of ["hover_tips", "disabled_tips"] as const) {
      const tip = output[field];
      if (!isRecord(tip) || tip.tag !== "plain_text" ||
        typeof tip.content !== "string") delete output[field];
    }
  }
  if (["multi_select_static", "multi_select_person", "select_img"]
    .includes(String(tag))) {
    output.selected_values = Array.isArray(output.selected_values)
      ? output.selected_values
      : [];
  }
  if (tag === "checker") output.checked = output.checked === true;
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

  const cloned = cloneOpaque(validation.card) as Record<string, unknown>;
  const rawInputConfig = isRecord(cloned.config) ? cloned.config : {};
  const rawInputStyle = isRecord(rawInputConfig.style) ? rawInputConfig.style : {};
  const customTextSizes = isRecord(rawInputStyle.text_size)
    ? Object.keys(rawInputStyle.text_size) : [];
  const state = {
    componentCount: 0,
    textSizes: new Set(["normal", "notation", "heading", ...customTextSizes]),
  };
  if (isRecord(cloned.header)) {
    normalizeSlots(headerChildSlots(cloned.header), "$.header", 0, state);
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
