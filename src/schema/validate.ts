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
import { safePx } from "../styles/safe";

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
};

function validateTaggedNodes(
  value: unknown,
  path: ProtocolPath,
  depth: number,
  state: WalkState,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateTaggedNodes(item, childPath(path, index), depth, state);
    });
    return;
  }
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

  if ("element_id" in value) {
    const idPath = childPath(path, "element_id");
    if (!isValidElementId(value.element_id)) {
      state.diagnostics.push(diagnostic(
        "invalid_element_id",
        idPath,
        "element_id must start with a letter, contain only letters, digits, or underscores, and be at most 20 characters.",
      ));
    } else {
      const previous = state.elementIds.get(value.element_id);
      if (previous) {
        state.diagnostics.push(diagnostic(
          "duplicate_element_id",
          idPath,
          `element_id "${value.element_id}" duplicates ${previous}.`,
        ));
      } else {
        state.elementIds.set(value.element_id, idPath);
      }
    }
  }

  for (const [key, allowed] of Object.entries(ENUMS)) {
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
  if (tag) validateTaggedStyleFields(value, path, state);

  for (const [key, child] of Object.entries(value)) {
    validateTaggedNodes(child, childPath(path, key), nextDepth, state);
  }
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

  const state: WalkState = {
    diagnostics: [],
    componentCount: 0,
    elementIds: new Map(),
    formNames: new Map(),
    fieldNames: new Map(),
  };
  validateTaggedNodes(input, "$", 0, state);

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
