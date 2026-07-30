import type { Card } from "./card";
import {
  CONTAINER_TAGS,
  KNOWN_TAGS,
} from "./components";
import {
  childPath,
  type CardDiagnostic,
  type CardDiagnosticCode,
  type ProtocolPath,
  type ValidationResult,
} from "./diagnostics";
import { isValidElementId } from "./identity";
import { invalidStyleFields } from "./style-policy";
import {
  componentChildSlots,
  headerChildSlots,
  type ProtocolChildSlot,
} from "./traversal-policy";
import { safePx, safeRgba } from "../styles/safe";

const FORM_INTERACTIVE_TAGS = new Set([
  "input",
  "button",
  "overflow",
  "select_static",
  "multi_select_static",
  "select_person",
  "multi_select_person",
  "date_picker",
  "picker_time",
  "picker_datetime",
  "select_img",
  "checker",
]);
const FORM_ONLY_TAGS = new Set([
  "multi_select_static",
  "multi_select_person",
]);

const ENUMS: Record<string, readonly string[]> = {
  width_mode: ["default", "compact", "fill"],
  direction: ["vertical", "horizontal"],
  horizontal_align: ["left", "center", "right"],
  vertical_align: ["top", "center", "bottom"],
  input_type: ["text", "multiline_text", "password"],
  form_action_type: ["submit", "reset"],
  aspect_ratio: ["1:1", "2:1", "4:3", "16:9"],
  combination_mode: ["double", "triple", "bisect", "trisect"],
  row_height: ["low", "medium", "high"],
  data_type: ["text", "lark_md", "options", "number", "persons", "date", "markdown"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnostic(
  code: CardDiagnosticCode,
  path: ProtocolPath,
  message: string,
  classification: "fatal" | "recoverable" = "recoverable",
): CardDiagnostic {
  return {
    code,
    path,
    message,
    classification,
    severity: "error",
  };
}

function validateTaggedStyleFields(
  value: Record<string, unknown>,
  path: ProtocolPath,
  state: WalkState,
): void {
  const tag = typeof value.tag === "string" ? value.tag : undefined;
  for (const field of invalidStyleFields(tag, value)) {
    state.diagnostics.push(diagnostic(
      "invalid_style",
      childPath(path, field),
      `${field} contains an invalid or out-of-range length.`,
    ));
  }
}

type WalkState = {
  diagnostics: CardDiagnostic[];
  componentCount: number;
  elementIds: Map<string, ProtocolPath>;
  formNames: Map<string, ProtocolPath>;
  fieldNames: Map<string, ProtocolPath>;
  textSizes: ReadonlySet<string>;
};

function validateProtocolSlots(
  slots: readonly ProtocolChildSlot[],
  path: ProtocolPath,
  depth: number,
  state: WalkState,
): void {
  for (const slot of slots) {
    const childProtocolPath = slot.path.reduce<ProtocolPath>(
      (current, segment) => childPath(current, segment),
      path,
    );
    validateTaggedNode(slot.value, childProtocolPath, depth, state);
  }
}

function validateEnums(
  value: Readonly<Record<string, unknown>>,
  path: ProtocolPath,
  state: WalkState,
  fields: readonly string[] = Object.keys(ENUMS),
): void {
  for (const key of fields) {
    const allowed = ENUMS[key];
    if (!allowed) continue;
    const candidate = value[key];
    if (candidate !== undefined &&
      (typeof candidate !== "string" || !allowed.includes(candidate))) {
      state.diagnostics.push(diagnostic(
        "invalid_enum",
        childPath(path, key),
        `${key} must be one of: ${allowed.join(", ")}.`,
      ));
    }
  }
}

function validateTagSpecificFields(
  tag: string,
  value: Readonly<Record<string, unknown>>,
  path: ProtocolPath,
  state: WalkState,
): void {
  const invalidStructure = (field: string, message: string) => {
    state.diagnostics.push(diagnostic(
      "invalid_structure",
      childPath(path, field),
      message,
    ));
  };
  if (tag === "button") {
    for (const [field, allowed] of Object.entries({
      type: ["default", "primary", "danger", "text",
        "primary_text", "danger_text", "primary_filled", "danger_filled", "laser"],
      size: ["small", "medium", "large"],
      width: ["default", "fill"],
    })) {
      const candidate = value[field];
      if (candidate !== undefined &&
        (typeof candidate !== "string" || !allowed.includes(candidate))) {
        state.diagnostics.push(diagnostic(
          "invalid_enum",
          childPath(path, field),
          `${field} must be one of: ${allowed.join(", ")}.`,
        ));
      }
    }
  }
  if ((tag === "person" || tag === "person_list") &&
    value.size !== undefined &&
    !["small", "medium", "large"].includes(String(value.size))) {
    state.diagnostics.push(diagnostic(
      "invalid_enum", childPath(path, "size"),
      `${tag}.size must be small, medium, or large.`,
    ));
  }
  if (tag === "markdown" && value.content !== undefined &&
    typeof value.content !== "string") {
    invalidStructure("content", "markdown.content must be a string.");
  }
  if (tag === "markdown") {
    if (value.text_align !== undefined &&
      !["left", "center", "right"].includes(String(value.text_align))) {
      state.diagnostics.push(diagnostic(
        "invalid_enum",
        childPath(path, "text_align"),
        "markdown.text_align must be left, center, or right.",
      ));
    }
    if (value.text_size !== undefined && typeof value.text_size !== "string") {
      invalidStructure("text_size", "markdown.text_size must be a string.");
    } else if (typeof value.text_size === "string" &&
      !state.textSizes.has(value.text_size)) {
      state.diagnostics.push(diagnostic(
        "invalid_enum",
        childPath(path, "text_size"),
        "markdown.text_size must be normal, notation, heading, or a configured text-size name.",
      ));
    }
    if (value.icon !== undefined) {
      if (!isRecord(value.icon) ||
        !["standard_icon", "custom_icon"].includes(String(value.icon.tag)) ||
        (value.icon.tag === "standard_icon" &&
          typeof value.icon.token !== "string") ||
        (value.icon.tag === "custom_icon" &&
          typeof value.icon.img_key !== "string")) {
        invalidStructure(
          "icon",
          "markdown.icon must be a standard_icon with token or custom_icon with img_key.",
        );
      }
    }
  }
  if (tag === "input" && value.max_length !== undefined &&
    (!Number.isInteger(value.max_length) ||
      Number(value.max_length) < 1 || Number(value.max_length) > 1000)) {
    invalidStructure("max_length", "input.max_length must be an integer from 1 to 1000.");
  }
  if (["overflow", "select_static", "multi_select_static", "select_person",
    "multi_select_person", "select_img"].includes(tag) &&
    value.options !== undefined && !Array.isArray(value.options)) {
    invalidStructure("options", `${tag}.options must be an array.`);
  }
  if (["multi_select_static", "multi_select_person", "select_img"].includes(tag) &&
    value.selected_values !== undefined && !Array.isArray(value.selected_values)) {
    invalidStructure(
      "selected_values",
      `${tag}.selected_values must be an array.`,
    );
  }
  if ((tag === "select_static" || tag === "select_person") &&
    value.initial_index !== undefined &&
    (!Number.isInteger(value.initial_index) || Number(value.initial_index) < 0)) {
    invalidStructure("initial_index", `${tag}.initial_index must be a non-negative integer.`);
  }
  const temporalPatterns: Partial<Record<string, RegExp>> = {
    date_picker: /^\d{4}-\d{2}-\d{2}$/,
    picker_time: /^(?:[01]\d|2[0-3]):[0-5]\d$/,
    picker_datetime: /^\d{4}-\d{2}-\d{2}[ T](?:[01]\d|2[0-3]):[0-5]\d$/,
  };
  const temporalFields: Partial<Record<string, string>> = {
    date_picker: "initial_date",
    picker_time: "initial_time",
    picker_datetime: "initial_datetime",
  };
  const temporalField = temporalFields[tag];
  const temporalPattern = temporalPatterns[tag];
  if (temporalField && temporalPattern && value[temporalField] !== undefined &&
    (typeof value[temporalField] !== "string" ||
      !temporalPattern.test(value[temporalField] as string))) {
    invalidStructure(temporalField, `${tag}.${temporalField} has an invalid format.`);
  }
  if (tag === "checker" && value.checked !== undefined &&
    typeof value.checked !== "boolean") {
    invalidStructure("checked", "checker.checked must be a boolean.");
  }
  if (tag === "table" && value.page_size !== undefined &&
    (!Number.isInteger(value.page_size) ||
      Number(value.page_size) < 1 || Number(value.page_size) > 10)) {
    invalidStructure("page_size", "table.page_size must be an integer from 1 to 10.");
  }
}

function validateTaggedNode(
  value: unknown,
  path: ProtocolPath,
  depth: number,
  state: WalkState,
): void {
  if (!isRecord(value)) return;

  const tag = typeof value.tag === "string" ? value.tag : undefined;
  const nextDepth = tag && CONTAINER_TAGS.has(tag) ? depth + 1 : depth;
  if (tag) {
    state.componentCount += 1;
    if (state.componentCount > 200) {
      state.diagnostics.push(diagnostic(
        "component_limit",
        childPath(path, "tag"),
        `Component ${state.componentCount} exceeds the 200 tag-node limit.`,
      ));
    }
    if (!KNOWN_TAGS.has(tag)) {
      state.diagnostics.push(diagnostic(
        "unknown_tag",
        childPath(path, "tag"),
        `Unknown JSON 2.0 tag "${tag}".`,
      ));
    }
    if (nextDepth > 5) {
      state.diagnostics.push(diagnostic(
        "container_depth",
        childPath(path, "tag"),
        `Container depth ${nextDepth} exceeds the maximum of 5.`,
      ));
    }
  }

  const elementIdDescriptor = Object.getOwnPropertyDescriptor(
    value,
    "element_id",
  );
  if (tag && elementIdDescriptor) {
    const idPath = childPath(path, "element_id");
    const elementId = "value" in elementIdDescriptor
      ? elementIdDescriptor.value
      : undefined;
    if (!isValidElementId(elementId)) {
      state.diagnostics.push(diagnostic(
        "invalid_element_id",
        idPath,
        "element_id must start with a letter, contain only letters, digits, or underscores, and be at most 20 characters.",
      ));
    } else {
      const previous = state.elementIds.get(elementId);
      if (previous) {
        state.diagnostics.push(diagnostic(
          "duplicate_element_id",
          idPath,
          `element_id "${elementId}" duplicates ${previous}.`,
        ));
      } else {
        state.elementIds.set(elementId, idPath);
      }
    }
  }

  validateEnums(value, path, state);
  if (tag) {
    validateTaggedStyleFields(value, path, state);
    validateTagSpecificFields(tag, value, path, state);
  }

  validateProtocolSlots(componentChildSlots(value), path, nextDepth, state);
}

type Context = {
  inForm: boolean;
  directBody: boolean;
  parentTag?: string;
};

function componentChildren(
  node: Record<string, unknown>,
): Array<{ value: unknown; pathKey: "elements" | "columns" }> {
  if (node.tag === "column_set") {
    return [{ value: node.columns, pathKey: "columns" }];
  }
  if (["column", "form", "interactive_container", "collapsible_panel"].includes(
    String(node.tag),
  )) {
    return [{ value: node.elements, pathKey: "elements" }];
  }
  return [];
}

function hasSubmitButton(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasSubmitButton);
  if (!isRecord(value)) return false;
  if (value.tag === "button" && value.form_action_type === "submit") return true;
  return componentChildren(value).some(({ value: children }) =>
    hasSubmitButton(children)
  );
}

function findNestedTag(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedTag(item);
      if (found) return found;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  if (typeof value.tag === "string") return value.tag;
  for (const child of Object.values(value)) {
    const found = findNestedTag(child);
    if (found) return found;
  }
  return undefined;
}

function validateComponentTree(
  value: unknown,
  path: ProtocolPath,
  context: Context,
  state: WalkState,
): void {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    const itemPath = childPath(path, index);
    if (!isRecord(item) || typeof item.tag !== "string") {
      state.diagnostics.push(diagnostic(
        "invalid_structure",
        itemPath,
        "Component entries must be objects with a string tag.",
      ));
      return;
    }
    const tag = item.tag;
    const inForm = context.inForm || tag === "form";

    if ((tag === "form" || tag === "table") && !context.directBody) {
      state.diagnostics.push(diagnostic(
        "root_only_component",
        childPath(itemPath, "tag"),
        `${tag} is only allowed directly in body.elements.`,
      ));
    }
    if (tag === "column" && context.parentTag !== "column_set") {
      state.diagnostics.push(diagnostic(
        "forbidden_child",
        childPath(itemPath, "tag"),
        "column is only allowed directly inside column_set.columns.",
      ));
    }
    if (FORM_ONLY_TAGS.has(tag) && !context.inForm) {
      state.diagnostics.push(diagnostic(
        "form_only_component",
        childPath(itemPath, "tag"),
        `${tag} is only allowed inside a form.`,
      ));
    }
    if (tag === "select_img" && item.multi_select === true && !context.inForm) {
      state.diagnostics.push(diagnostic(
        "select_img_multi_requires_form",
        childPath(itemPath, "multi_select"),
        "select_img can only enable multi_select inside a form.",
      ));
    }
    if (context.parentTag &&
      ["column", "interactive_container"].includes(context.parentTag) &&
      ["form", "table"].includes(tag)) {
      state.diagnostics.push(diagnostic(
        "forbidden_child",
        childPath(itemPath, "tag"),
        `${context.parentTag} cannot contain ${tag}.`,
      ));
    }
    if (context.parentTag === "collapsible_panel" && tag === "form") {
      state.diagnostics.push(diagnostic(
        "forbidden_child",
        childPath(itemPath, "tag"),
        "collapsible_panel cannot contain form.",
      ));
    }
    if (tag === "collapsible_panel" && isRecord(item.header) &&
      item.header.position !== undefined &&
      !["top", "bottom"].includes(String(item.header.position))) {
      state.diagnostics.push(diagnostic(
        "invalid_enum",
        childPath(childPath(itemPath, "header"), "position"),
        "collapsible_panel.header.position must be top or bottom.",
      ));
    }
    if (tag === "collapsible_panel" && isRecord(item.header) &&
      item.header.icon_position !== undefined &&
      !["left", "right"].includes(String(item.header.icon_position))) {
      state.diagnostics.push(diagnostic(
        "invalid_enum",
        childPath(childPath(itemPath, "header"), "icon_position"),
        "collapsible_panel.header.icon_position must be left or right.",
      ));
    }
    if (tag === "collapsible_panel" && isRecord(item.border) &&
      item.border.corner_radius !== undefined &&
      safePx(item.border.corner_radius) === undefined) {
      state.diagnostics.push(diagnostic(
        "invalid_style",
        childPath(childPath(itemPath, "border"), "corner_radius"),
        "collapsible_panel.border.corner_radius is out of range.",
      ));
    }
    if (context.inForm && tag === "chart") {
      state.diagnostics.push(diagnostic(
        "form_chart_forbidden",
        childPath(itemPath, "tag"),
        "chart is conservatively disallowed inside form.",
      ));
    }
    if (tag === "table") {
      if (Array.isArray(item.columns) && item.columns.some((column) =>
        !isRecord(column) ||
        ![
          "text", "lark_md", "options", "number", "persons", "date",
          "markdown",
        ].includes(
          String(column.data_type),
        ))) {
        state.diagnostics.push(diagnostic(
          "invalid_structure",
          childPath(itemPath, "columns"),
          "table.columns must use supported column definitions.",
        ));
      }
      for (const key of ["columns", "rows"] as const) {
        const nestedTag = findNestedTag(item[key]);
        if (nestedTag) {
          state.diagnostics.push(diagnostic(
            "forbidden_child",
            childPath(itemPath, key),
            `table data cannot contain card component tag "${nestedTag}".`,
          ));
        }
      }
    }
    if (tag === "person_list" && Array.isArray(item.persons) &&
      item.persons.some((person) =>
        !isRecord(person) || typeof person.id !== "string" ||
        person.id.length === 0)) {
      state.diagnostics.push(diagnostic(
        "invalid_structure",
        childPath(itemPath, "persons"),
        "person_list.persons must contain non-empty string ids.",
      ));
    }

    if (tag === "form") {
      const namePath = childPath(itemPath, "name");
      if (typeof item.name !== "string" || item.name.length === 0) {
        state.diagnostics.push(diagnostic(
          "form_name_required",
          namePath,
          "form.name is required.",
        ));
      } else {
        const previous = state.formNames.get(item.name);
        if (previous) {
          state.diagnostics.push(diagnostic(
            "duplicate_form_name",
            namePath,
            `form.name "${item.name}" duplicates ${previous}.`,
          ));
        } else {
          state.formNames.set(item.name, namePath);
        }
      }
      if (!hasSubmitButton(item.elements)) {
        state.diagnostics.push(diagnostic(
          "form_submit_required",
          childPath(itemPath, "elements"),
          "form must contain at least one submit button.",
        ));
      }
    }

    if (context.inForm && FORM_INTERACTIVE_TAGS.has(tag)) {
      const namePath = childPath(itemPath, "name");
      if (typeof item.name !== "string" || item.name.length === 0) {
        state.diagnostics.push(diagnostic(
          "form_field_name_required",
          namePath,
          `${tag}.name is required inside form.`,
        ));
      } else {
        const previous = state.fieldNames.get(item.name);
        if (previous) {
          state.diagnostics.push(diagnostic(
            "duplicate_form_field_name",
            namePath,
            `Form field name "${item.name}" duplicates ${previous}.`,
          ));
        } else {
          state.fieldNames.set(item.name, namePath);
        }
      }
    }

    for (const child of componentChildren(item)) {
      const childrenPath = childPath(itemPath, child.pathKey);
      if (!Array.isArray(child.value)) {
        state.diagnostics.push(diagnostic(
          "invalid_structure",
          childrenPath,
          `${child.pathKey} must be an array.`,
        ));
        continue;
      }
      validateComponentTree(child.value, childrenPath, {
        inForm,
        directBody: false,
        parentTag: tag,
      }, state);
    }
  });
}

export function validateCard(input: unknown): ValidationResult<Card> {
  if (!isRecord(input)) {
    return {
      valid: false,
      fatal: true,
      card: null,
      diagnostics: [diagnostic(
        "invalid_root",
        "$",
        "Card root must be an object.",
        "fatal",
      )],
    };
  }
  if (input.schema !== "2.0") {
    return {
      valid: false,
      fatal: true,
      card: null,
      diagnostics: [diagnostic(
        "invalid_schema",
        "$.schema",
        'Card schema must be exactly "2.0".',
        "fatal",
      )],
    };
  }

  const configuredTextSizes = isRecord(input.config) &&
    isRecord(input.config.style) && isRecord(input.config.style.text_size)
    ? Object.keys(input.config.style.text_size)
    : [];
  const state: WalkState = {
    diagnostics: [],
    componentCount: 0,
    elementIds: new Map(),
    formNames: new Map(),
    fieldNames: new Map(),
    textSizes: new Set(["normal", "notation", "heading", ...configuredTextSizes]),
  };
  if (isRecord(input.header)) {
    validateProtocolSlots(headerChildSlots(input.header), "$.header", 0, state);
  }
  if (isRecord(input.config)) {
    validateEnums(input.config, "$.config", state, ["width_mode"]);
    if (isRecord(input.config.style)) {
      const style = input.config.style;
      if (isRecord(style.text_size)) {
        for (const [name, definition] of Object.entries(style.text_size)) {
          if (!isRecord(definition) || ["default", "pc", "mobile"].some(
            (device) => definition[device] !== undefined &&
              !["normal", "notation", "heading"].includes(
                String(definition[device]),
              ),
          )) {
            state.diagnostics.push(diagnostic(
              "invalid_enum",
              `$.config.style.text_size.${name}`,
              "Custom text sizes may map default, pc, and mobile to normal, notation, or heading.",
            ));
          }
        }
      }
      if (isRecord(style.color)) {
        for (const [name, definition] of Object.entries(style.color)) {
          if (!isRecord(definition) || ["light_mode", "dark_mode"].some(
            (mode) => definition[mode] !== undefined &&
              safeRgba(definition[mode]) === undefined,
          )) {
            state.diagnostics.push(diagnostic(
              "invalid_style",
              `$.config.style.color.${name}`,
              "Custom colors must use bounded RGBA light_mode and dark_mode values.",
            ));
          }
        }
      }
    }
  }
  if (isRecord(input.body)) {
    validateEnums(input.body, "$.body", state, [
      "direction",
      "horizontal_align",
      "vertical_align",
    ]);
    if (Array.isArray(input.body.elements)) {
      validateProtocolSlots(
        input.body.elements.map((value, index) => ({
          value,
          path: [index],
          replace: () => {},
        })),
        "$.body.elements",
        0,
        state,
      );
    }
  }

  if (input.config !== undefined && !isRecord(input.config)) {
    state.diagnostics.push(diagnostic(
      "invalid_structure",
      "$.config",
      "config must be an object.",
    ));
  } else if (isRecord(input.config) &&
    input.config.update_multi !== undefined &&
    input.config.update_multi !== true) {
    state.diagnostics.unshift(diagnostic(
      "update_multi_must_be_true",
      "$.config.update_multi",
      "JSON 2.0 only supports shared cards; update_multi must be true.",
    ));
  }

  if (input.header !== undefined) {
    if (!isRecord(input.header)) {
      state.diagnostics.push(diagnostic(
        "invalid_structure",
        "$.header",
        "header must be an object.",
      ));
    } else if (!isRecord(input.header.title)) {
      const insertion = state.diagnostics.findIndex(({ path }) =>
        path.startsWith("$.body")
      );
      state.diagnostics.splice(
        insertion < 0 ? state.diagnostics.length : insertion,
        0,
        diagnostic(
          "header_title_required",
          "$.header.title",
          "header.title is required when header is present.",
        ),
      );
    }
  }

  if (input.body !== undefined && !isRecord(input.body)) {
    state.diagnostics.push(diagnostic(
      "invalid_structure",
      "$.body",
      "body must be an object.",
    ));
  } else if (isRecord(input.body)) {
    if (input.body.elements !== undefined && !Array.isArray(input.body.elements)) {
      state.diagnostics.push(diagnostic(
        "invalid_structure",
        "$.body.elements",
        "body.elements must be an array.",
      ));
    } else {
      validateComponentTree(input.body.elements ?? [], "$.body.elements", {
        inForm: false,
        directBody: true,
      }, state);
    }
  }

  return {
    valid: state.diagnostics.length === 0,
    fatal: false,
    card: input as Card,
    diagnostics: state.diagnostics,
  };
}
