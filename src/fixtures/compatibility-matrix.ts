import type { Card } from "../schema/card";
import {
  CARD_COMPONENT_TAGS,
  type CardComponentTag,
} from "../schema/components";
import { minimalCardsByTag } from "./schema-cards";

export type NestingContext =
  | "body"
  | "column"
  | "form"
  | "interactive_container"
  | "collapsible_panel";
export type ResourceFixtureKind = "image" | "person" | "chart" | "none";
export type CompleteFieldEvidence =
  | "dom-difference"
  | "identity-diagnostic"
  | "required-diagnostic"
  | "explicit-interaction";

function evidenced(
  fields: readonly string[],
  interactions: readonly string[] = [],
  diagnostics: readonly string[] = [],
): Readonly<Record<string, CompleteFieldEvidence>> {
  return Object.fromEntries(fields.map((field) => [
    field,
    field === "element_id" ? "identity-diagnostic"
      : diagnostics.includes(field) ? "required-diagnostic"
      : interactions.includes(field) ? "explicit-interaction"
        : "dom-difference",
  ]));
}

export type TagCompatibilityFixture = {
  tag: CardComponentTag;
  minimal: Card;
  complete: Card;
  completeFields: readonly string[];
  defaults: Card;
  defaultValues: Readonly<Record<string, unknown>> | null;
  invalid: Card;
  invalidFields: readonly string[];
  expectedInvalidCodes: readonly string[];
  preservedUnknownField: string;
  nesting: {
    allowed: readonly NestingContext[];
    forbidden: Readonly<Partial<Record<NestingContext, string>>>;
  };
  resource: {
    kind: ResourceFixtureKind;
    modes: readonly (
      | "missing" | "resolved" | "rejected" | "aborted"
      | "runtime_ready" | "runtime_rejected" | "late_unmount"
    )[];
  };
};

const plain = (content: string) => ({ tag: "plain_text", content });
const option = (content: string, value: string) => ({
  text: plain(content),
  value,
});

const completePatchByTag: Record<CardComponentTag, Record<string, unknown>> = {
  column_set: {
    element_id: "complete_columns", horizontal_spacing: "12px",
    horizontal_align: "center",
  },
  column: {
    element_id: "complete_column", width: "weighted", weight: 2,
    direction: "horizontal", horizontal_spacing: "8px",
    vertical_spacing: "4px", horizontal_align: "center",
    vertical_align: "bottom", padding: "4px 8px",
  },
  form: {
    element_id: "complete_form", name: "form", direction: "horizontal",
    horizontal_spacing: "8px", vertical_spacing: "4px",
    horizontal_align: "center", vertical_align: "bottom",
  },
  interactive_container: {
    element_id: "complete_interactive",
    direction: "horizontal", horizontal_spacing: "8px",
    vertical_spacing: "4px", horizontal_align: "center",
    vertical_align: "bottom", padding: "8px", has_border: true,
    corner_radius: "8px",
    behaviors: [{ type: "callback", value: { complete: true } }],
  },
  collapsible_panel: {
    element_id: "complete_panel", expanded: true,
    header: {
      title: plain("Complete panel"), position: "bottom",
      icon_position: "right",
    },
    border: { color: "grey", corner_radius: "8px" },
  },
  div: {
    element_id: "complete_div", margin: "-4px 0px",
    text: plain("Complete div"),
  },
  markdown: {
    element_id: "complete_markdown", content: "**Complete**",
    text_size: "heading", text_align: "center",
    icon: { tag: "standard_icon", token: "info_outlined", color: "blue" },
    margin: "4px 0px",
  },
  img: {
    element_id: "complete_img", img_key: "complete-image",
    alt: plain("Complete image"), title: plain("Image title"),
    margin: "4px 0px", corner_radius: "8px",
  },
  img_combination: {
    element_id: "complete_gallery", combination_mode: "triple",
    corner_radius: "8px",
    img_list: [
      { img_key: "one", alt: plain("One") },
      { img_key: "two", alt: plain("Two") },
      { img_key: "three", alt: plain("Three") },
    ],
  },
  person: {
    element_id: "complete_person", user_id: "person-a", size: "large",
    show_avatar: true, show_name: true,
  },
  person_list: {
    element_id: "complete_people",
    persons: [{ id: "person-a" }, { id: "person-b" }],
    lines: 2, size: "small",
    show_avatar: true, show_name: true,
  },
  chart: {
    element_id: "complete_chart", chart_spec: {
      type: "bar", data: [{ id: "data", values: [
        { category: "A", value: 1 },
      ] }], xField: "category", yField: "value", media: [],
    },
    aspect_ratio: "16:9", height: "240px",
    margin: "4px 0px", preview: true,
  },
  table: {
    element_id: "complete_table", page_size: 1, row_height: "high",
    columns: [{
      name: "amount", display_name: "Amount", data_type: "number",
      width: "120px", format: { symbol: "¥", precision: 2, separator: true },
    }],
    rows: [{ amount: 12.5 }],
  },
  hr: { element_id: "complete_hr", margin: "4px 0px" },
  input: {
    element_id: "complete_input", name: "field", label: plain("Input"),
    placeholder: plain("Placeholder"), default_value: "value",
    input_type: "multiline_text", max_length: 20, rows: 2,
    disabled: false, required: true, hover_tips: plain("Hover"),
    disabled_tips: plain("Disabled"),
    behaviors: [{ type: "callback", value: { complete: true } }],
  },
  button: {
    element_id: "complete_button", name: "button", text: plain("Button"),
    value: { complete: true },
    disabled: false, hover_tips: plain("Hover"),
    disabled_tips: plain("Disabled"),
    confirm: { title: plain("Confirm"), text: plain("Continue?") },
    behaviors: [{ type: "callback", value: { complete: true } }],
  },
  overflow: {
    element_id: "complete_overflow", name: "overflow",
    options: [{ ...option("Option", "option"),
      behaviors: [{ type: "callback", value: { complete: true } }] }],
    disabled: false, hover_tips: plain("Hover"),
    disabled_tips: plain("Disabled"),
  },
  select_static: {
    element_id: "complete_static", name: "static", label: plain("Static"),
    placeholder: plain("Choose"), options: [option("A", "a"), option("B", "b")],
    initial_option: "b", initial_index: 1, disabled: false, required: true,
    behaviors: [{ type: "callback", value: { complete: true } }],
  },
  multi_select_static: {
    element_id: "complete_mstatic", name: "field",
    label: plain("Static multi"),
    options: [option("A", "a"), option("B", "b")],
    selected_values: ["a"], disabled: false, required: true,
  },
  select_person: {
    element_id: "complete_sperson", name: "person",
    label: plain("Person"), placeholder: plain("Choose"),
    options: [option("A", "person-a")], initial_option: "person-a",
    initial_index: 0, disabled: false, required: true,
  },
  multi_select_person: {
    element_id: "complete_mperson", name: "field",
    label: plain("People"),
    options: [option("A", "person-a"), option("B", "person-b")],
    selected_values: ["person-a"], disabled: false, required: true,
  },
  date_picker: {
    element_id: "complete_date", name: "date", label: plain("Date"),
    initial_date: "2026-07-27",
    disabled: false, required: true,
  },
  picker_time: {
    element_id: "complete_time", name: "time", label: plain("Time"),
    initial_time: "09:30",
    disabled: false, required: true,
  },
  picker_datetime: {
    element_id: "complete_datetime", name: "datetime",
    label: plain("Datetime"),
    initial_datetime: "2026-07-27 09:30", disabled: false, required: true,
  },
  select_img: {
    element_id: "complete_select_img", name: "images", multi_select: true,
    options: [
      { ...option("One", "one"), img_key: "one" },
      { ...option("Two", "two"), img_key: "two" },
    ],
    selected_values: ["one"], disabled: false,
  },
  checker: {
    element_id: "complete_checker", name: "checker", checked: true,
    text: plain("Checked"), disabled: false, required: true,
  },
};

// This contract is intentionally independent from completePatchByTag. A new
// public field must update both the fixture and this reviewable acceptance list.
export const completeFieldEvidenceByTag = {
  column_set: evidenced(["tag", "element_id", "columns", "horizontal_spacing", "horizontal_align"]),
  column: evidenced(["tag", "element_id", "elements", "width", "weight", "direction", "horizontal_spacing", "vertical_spacing", "horizontal_align", "vertical_align", "padding"]),
  form: evidenced(["tag", "element_id", "name", "elements", "direction", "horizontal_spacing", "vertical_spacing", "horizontal_align", "vertical_align"], [], ["name"]),
  interactive_container: evidenced(["tag", "element_id", "elements", "direction", "horizontal_spacing", "vertical_spacing", "horizontal_align", "vertical_align", "padding", "has_border", "corner_radius", "behaviors"]),
  collapsible_panel: evidenced(["tag", "element_id", "elements", "expanded", "header", "border"]),
  div: evidenced(["tag", "element_id", "margin", "text"]),
  markdown: evidenced(["tag", "element_id", "content", "text_size", "text_align", "icon", "margin"]),
  img: evidenced(["tag", "element_id", "img_key", "alt", "title", "margin", "corner_radius"]),
  img_combination: evidenced(["tag", "element_id", "combination_mode", "corner_radius", "img_list"]),
  person: evidenced(["tag", "element_id", "user_id", "size", "show_avatar", "show_name"]),
  person_list: evidenced(["tag", "element_id", "persons", "lines", "size", "show_avatar", "show_name"]),
  chart: evidenced(["tag", "element_id", "chart_spec", "aspect_ratio", "height", "margin", "preview"]),
  table: evidenced(["tag", "element_id", "page_size", "row_height", "columns", "rows"]),
  hr: evidenced(["tag", "element_id", "margin"]),
  input: evidenced(["tag", "element_id", "name", "label", "placeholder", "default_value", "input_type", "max_length", "rows", "disabled", "required", "hover_tips", "disabled_tips", "behaviors"], ["behaviors"]),
  button: evidenced(["tag", "element_id", "name", "text", "value", "disabled", "hover_tips", "disabled_tips", "confirm", "behaviors"], ["name", "value", "confirm", "behaviors"]),
  overflow: evidenced(["tag", "element_id", "name", "options", "disabled", "hover_tips", "disabled_tips"], ["name", "options"]),
  select_static: evidenced(["tag", "element_id", "name", "label", "placeholder", "options", "initial_option", "initial_index", "disabled", "required", "behaviors"], ["behaviors"]),
  multi_select_static: evidenced(["tag", "element_id", "name", "label", "options", "selected_values", "disabled", "required"]),
  select_person: evidenced(["tag", "element_id", "name", "label", "placeholder", "options", "initial_option", "initial_index", "disabled", "required"]),
  multi_select_person: evidenced(["tag", "element_id", "name", "label", "options", "selected_values", "disabled", "required"]),
  date_picker: evidenced(["tag", "element_id", "name", "label", "initial_date", "disabled", "required"]),
  picker_time: evidenced(["tag", "element_id", "name", "label", "initial_time", "disabled", "required"]),
  picker_datetime: evidenced(["tag", "element_id", "name", "label", "initial_datetime", "disabled", "required"]),
  select_img: evidenced(["tag", "element_id", "name", "multi_select", "options", "selected_values", "disabled"]),
  checker: evidenced(["tag", "element_id", "name", "checked", "text", "disabled", "required"]),
} satisfies Record<
  CardComponentTag,
  Readonly<Record<string, CompleteFieldEvidence>>
>;

const defaultValuesByTag: Record<CardComponentTag, Record<string, unknown> | null> = {
  column_set: {
    columns: [{ tag: "column", elements: [], direction: "vertical" }],
  },
  column: { elements: [], direction: "vertical" },
  form: { direction: "vertical" },
  interactive_container: { elements: [], direction: "vertical" },
  collapsible_panel: {
    elements: [], direction: "vertical", expanded: false,
    header: { position: "top", icon_position: "left" },
  },
  div: null,
  markdown: { text_size: "normal", text_align: "left" },
  img: null,
  img_combination: { combination_mode: "double" },
  person: { size: "medium", show_avatar: true, show_name: true },
  person_list: { size: "medium", show_avatar: true, show_name: true },
  chart: null,
  table: { columns: [], rows: [], page_size: 5, row_height: "medium" },
  hr: null,
  input: {
    default_value: "", input_type: "text", max_length: 1000,
    disabled: false, required: false,
  },
  button: { disabled: false, required: false },
  overflow: { disabled: false, required: false },
  select_static: { disabled: false, required: false },
  multi_select_static: {
    selected_values: [], disabled: false, required: false,
  },
  select_person: { disabled: false, required: false },
  multi_select_person: {
    selected_values: [], disabled: false, required: false,
  },
  date_picker: { disabled: false, required: false },
  picker_time: { disabled: false, required: false },
  picker_datetime: { disabled: false, required: false },
  select_img: {
    multi_select: false, selected_values: [], disabled: false, required: false,
  },
  checker: { checked: false, disabled: false, required: false },
};

const invalidPatchByTag: Record<CardComponentTag, Record<string, unknown>> = {
  column_set: { horizontal_spacing: "100px", horizontal_align: "sideways" },
  column: { padding: "100px", direction: "diagonal" },
  form: { direction: "diagonal", horizontal_spacing: "-1px" },
  interactive_container: { direction: "diagonal", corner_radius: "100px" },
  collapsible_panel: {
    header: { position: "sideways", icon_position: "middle" },
    border: { corner_radius: "100px" },
  },
  div: { margin: "100px" },
  markdown: {
    content: 42, text_size: "giant", text_align: "justify",
    icon: { tag: "custom_icon" }, margin: "100px",
  },
  img: { corner_radius: "100px", margin: "100px" },
  img_combination: { combination_mode: "unknown", corner_radius: "100px" },
  person: { size: "huge" },
  person_list: { size: "huge", persons: [null, {}, { id: 2 }] },
  chart: { aspect_ratio: "3:2", height: "1000px" },
  table: { page_size: 99, row_height: "giant",
    columns: [{ data_type: "widget" }] },
  hr: { margin: "100px" },
  input: { input_type: "email", max_length: 1001 },
  button: { form_action_type: "send" },
  overflow: { options: "invalid" },
  select_static: { options: "invalid", initial_index: -1 },
  multi_select_static: { selected_values: "invalid" },
  select_person: { options: "invalid", initial_index: -1 },
  multi_select_person: { selected_values: "invalid" },
  date_picker: { initial_date: "not-a-date" },
  picker_time: { initial_time: "25:99" },
  picker_datetime: { initial_datetime: "not-a-datetime" },
  select_img: { multi_select: true, options: "invalid" },
  checker: { checked: "yes" },
};

const invalidCodesByTag: Record<CardComponentTag, readonly string[]> = {
  column_set: ["invalid_enum", "invalid_style"],
  column: ["invalid_enum", "invalid_style"],
  form: ["invalid_enum", "invalid_style"],
  interactive_container: ["invalid_enum", "invalid_style"],
  collapsible_panel: ["invalid_enum", "invalid_style"],
  div: ["invalid_style"],
  markdown: ["invalid_structure", "invalid_enum", "invalid_style"],
  img: ["invalid_style"],
  img_combination: ["invalid_enum", "invalid_style"],
  person: ["invalid_enum"],
  person_list: ["invalid_enum"],
  chart: ["invalid_enum", "invalid_style"],
  table: ["invalid_enum", "invalid_structure"],
  hr: ["invalid_style"],
  input: ["invalid_enum", "invalid_structure"],
  button: ["invalid_enum"],
  overflow: ["invalid_structure"],
  select_static: ["invalid_structure"],
  multi_select_static: ["invalid_structure"],
  select_person: ["invalid_structure"],
  multi_select_person: ["invalid_structure"],
  date_picker: ["invalid_structure"],
  picker_time: ["invalid_structure"],
  picker_datetime: ["invalid_structure"],
  select_img: ["invalid_structure", "select_img_multi_requires_form"],
  checker: ["invalid_structure"],
};

const allContainers: NestingContext[] = [
  "body", "column", "form", "interactive_container", "collapsible_panel",
];
const nestingByTag = CARD_COMPONENT_TAGS.reduce(
  (matrix, tag) => {
    matrix[tag] = { allowed: allContainers, forbidden: {} };
    return matrix;
  },
  {} as Record<CardComponentTag, TagCompatibilityFixture["nesting"]>,
);

nestingByTag.column = { allowed: ["column"], forbidden: {
  body: "forbidden_child", form: "forbidden_child",
  interactive_container: "forbidden_child",
  collapsible_panel: "forbidden_child",
} };
nestingByTag.form = { allowed: ["body"], forbidden: {
  column: "root_only_component", form: "root_only_component",
  interactive_container: "root_only_component",
  collapsible_panel: "root_only_component",
} };
nestingByTag.table = { allowed: ["body"], forbidden: {
  column: "root_only_component", form: "root_only_component",
  interactive_container: "root_only_component",
  collapsible_panel: "root_only_component",
} };
nestingByTag.chart = {
  allowed: ["body", "column", "interactive_container", "collapsible_panel"],
  forbidden: { form: "form_chart_forbidden" },
};
nestingByTag.multi_select_static = {
  allowed: ["form"], forbidden: {
    body: "form_only_component", column: "form_only_component",
    interactive_container: "form_only_component",
    collapsible_panel: "form_only_component",
  },
};
nestingByTag.multi_select_person = {
  allowed: ["form"], forbidden: {
    body: "form_only_component", column: "form_only_component",
    interactive_container: "form_only_component",
    collapsible_panel: "form_only_component",
  },
};

const resourceKindByTag: Partial<Record<CardComponentTag, ResourceFixtureKind>> = {
  img: "image",
  img_combination: "image",
  person: "person",
  person_list: "person",
  chart: "chart",
  select_img: "image",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function findFixtureTarget(
  value: unknown,
  tag: CardComponentTag,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (!Array.isArray(value) && (value as { tag?: unknown }).tag === tag) {
    return value as Record<string, unknown>;
  }
  for (const child of Object.values(value)) {
    const target = findFixtureTarget(child, tag);
    if (target) return target;
  }
  return undefined;
}

function cardWithPatch(
  tag: CardComponentTag,
  patch: Record<string, unknown>,
  wrapSelectImageInForm = false,
): Card {
  const card = clone(minimalCardsByTag[tag]);
  const target = findFixtureTarget(card, tag);
  if (!target) throw new Error(`Missing fixture target ${tag}`);
  Object.assign(target, clone(patch));
  if (tag === "select_img" && wrapSelectImageInForm &&
    target.multi_select === true) {
    return {
      schema: "2.0",
      body: { elements: [{
        tag: "form",
        name: "select_img_form",
        elements: [
          target,
          {
            tag: "button", name: "submit", form_action_type: "submit",
            text: plain("Submit"),
          },
        ],
      }] },
    } as Card;
  }
  return card;
}

export function cardInNestingContext(
  tag: CardComponentTag,
  context: NestingContext,
): Card {
  const target = clone(findFixtureTarget(minimalCardsByTag[tag], tag));
  if (!target) throw new Error(`Missing fixture target ${tag}`);
  if (context === "body") {
    return { schema: "2.0", body: { elements: [target] } } as Card;
  }
  if (context === "column") {
    if (tag === "column") {
      return { schema: "2.0", body: { elements: [{
        tag: "column_set", columns: [target],
      }] } } as Card;
    }
    return { schema: "2.0", body: { elements: [{
      tag: "column_set", columns: [{ tag: "column", elements: [target] }],
    }] } } as Card;
  }
  const parent = context === "form"
    ? {
        tag: "form", name: `parent_${tag}`, elements: [
          target,
          { tag: "button", name: `submit_${tag}`, form_action_type: "submit",
            text: plain("Submit") },
        ],
      }
    : {
        tag: context,
        expanded: context === "collapsible_panel" ? true : undefined,
        elements: [target],
      };
  if (context === "form" && typeof target.name !== "string" &&
    !["div", "markdown", "img", "img_combination", "person", "person_list",
      "hr", "column_set", "collapsible_panel"].includes(tag)) {
    target.name = `field_${tag}`;
  }
  return { schema: "2.0", body: { elements: [parent] } } as Card;
}

export const compatibilityFixturesByTag = Object.fromEntries(
  CARD_COMPONENT_TAGS.map((tag): [CardComponentTag, TagCompatibilityFixture] => {
    const futureField = `future_${tag}`;
    const invalidPatch = {
      ...invalidPatchByTag[tag],
      [futureField]: { preserved: true },
    };
    const resourceKind = resourceKindByTag[tag] ?? "none";
    return [tag, {
      tag,
      minimal: clone(minimalCardsByTag[tag]),
      complete: cardWithPatch(tag, completePatchByTag[tag], true),
      completeFields: Object.keys(completeFieldEvidenceByTag[tag]),
      defaults: clone(minimalCardsByTag[tag]),
      defaultValues: defaultValuesByTag[tag],
      invalid: cardWithPatch(tag, invalidPatch),
      invalidFields: Object.keys(invalidPatchByTag[tag]),
      expectedInvalidCodes: invalidCodesByTag[tag],
      preservedUnknownField: futureField,
      nesting: nestingByTag[tag],
      resource: {
        kind: resourceKind,
        modes: resourceKind === "none" ? []
          : resourceKind === "chart"
            ? ["runtime_ready", "runtime_rejected", "late_unmount"]
            : ["missing", "resolved", "rejected", "aborted"],
      },
    }];
  }),
) as Record<CardComponentTag, TagCompatibilityFixture>;
