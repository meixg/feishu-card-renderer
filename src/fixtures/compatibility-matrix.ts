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

export type TagCompatibilityFixture = {
  tag: CardComponentTag;
  minimal: Card;
  complete: Card;
  completeFields: readonly string[];
  defaults: Card;
  defaultValues: Readonly<Record<string, unknown>>;
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
    modes: readonly ("missing" | "resolved" | "rejected" | "aborted")[];
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
    horizontal_align: "center", flex_mode: "none",
    background_style: "default",
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
    element_id: "complete_interactive", width: "fill", height: "auto",
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
    element_id: "complete_div", width: "fill", margin: "-4px 0px",
    text: { ...plain("Complete div"), text_size: "normal", lines: 2 },
    icon: { tag: "standard_icon", token: "chat-forbidden_outlined" },
  },
  markdown: {
    element_id: "complete_markdown", content: "**Complete**",
    text_size: "normal", text_align: "center",
    icon: { tag: "standard_icon", token: "chat-forbidden_outlined" },
  },
  img: {
    element_id: "complete_img", img_key: "complete-image",
    alt: plain("Complete image"), title: plain("Image title"),
    scale_type: "crop_center", size: "300px 180px", margin: "4px 0px",
    corner_radius: "8px", transparent: false, preview: true,
  },
  img_combination: {
    element_id: "complete_gallery", combination_mode: "triple",
    combination_transparent: false, corner_radius: "8px",
    img_list: [
      { img_key: "one", alt: plain("One"), transparent: false },
      { img_key: "two", alt: plain("Two"), transparent: true },
      { img_key: "three", alt: plain("Three") },
    ],
  },
  person: {
    element_id: "complete_person", user_id: "person-a", size: "large",
    show_avatar: true, show_name: true, style: "capsule",
  },
  person_list: {
    element_id: "complete_people",
    persons: [{ id: "person-a" }, { id: "person-b" }],
    drop_invalid_user_id: true, lines: 2, size: "small",
    show_avatar: true, show_name: true,
  },
  chart: {
    element_id: "complete_chart", chart_spec: {
      type: "bar", data: [{ id: "data", values: [
        { category: "A", value: 1 },
      ] }], xField: "category", yField: "value", media: [],
    },
    aspect_ratio: "16:9", color_theme: "brand", height: "240px",
    margin: "4px 0px", preview: true,
  },
  table: {
    element_id: "complete_table", page_size: 1, row_height: "high",
    freeze_first_column: true,
    header_style: { text_align: "center", text_size: "normal" },
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
    type: "primary", size: "medium", width: "fill", value: { complete: true },
    disabled: false, required: false, hover_tips: plain("Hover"),
    disabled_tips: plain("Disabled"),
    confirm: { title: plain("Confirm"), text: plain("Continue?") },
    behaviors: [{ type: "callback", value: { complete: true } }],
  },
  overflow: {
    element_id: "complete_overflow", name: "overflow",
    options: [{ ...option("Option", "option"),
      behaviors: [{ type: "callback", value: { complete: true } }] }],
    disabled: false, required: false, hover_tips: plain("Hover"),
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
    label: plain("Static multi"), placeholder: plain("Choose"),
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
    label: plain("People"), placeholder: plain("Choose"),
    options: [option("A", "person-a"), option("B", "person-b")],
    selected_values: ["person-a"], disabled: false, required: true,
  },
  date_picker: {
    element_id: "complete_date", name: "date", label: plain("Date"),
    placeholder: plain("Choose date"), initial_date: "2026-07-27",
    disabled: false, required: true,
  },
  picker_time: {
    element_id: "complete_time", name: "time", label: plain("Time"),
    placeholder: plain("Choose time"), initial_time: "09:30",
    disabled: false, required: true,
  },
  picker_datetime: {
    element_id: "complete_datetime", name: "datetime",
    label: plain("Datetime"), placeholder: plain("Choose datetime"),
    initial_datetime: "2026-07-27 09:30", disabled: false, required: true,
  },
  select_img: {
    element_id: "complete_select_img", name: "images", multi_select: true,
    options: [
      { ...option("One", "one"), img_key: "one" },
      { ...option("Two", "two"), img_key: "two" },
    ],
    selected_values: ["one"], disabled: false, required: true,
  },
  checker: {
    element_id: "complete_checker", name: "checker", checked: true,
    text: plain("Checked"), checked_style: { text_color: "green" },
    button_area: "all", disabled: false, required: true,
  },
};

const defaultValuesByTag: Record<CardComponentTag, Record<string, unknown>> = {
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
  div: {},
  markdown: {},
  img: {},
  img_combination: { combination_mode: "double" },
  person: { size: "medium", show_avatar: true, show_name: true },
  person_list: { size: "medium", show_avatar: true, show_name: true },
  chart: {},
  table: { columns: [], rows: [], page_size: 5, row_height: "medium" },
  hr: {},
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
  markdown: { content: 42 },
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
  markdown: ["invalid_structure"],
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

nestingByTag.column = { allowed: ["column"], forbidden: {} };
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
  allowed: ["form"], forbidden: { body: "form_only_component" },
};
nestingByTag.multi_select_person = {
  allowed: ["form"], forbidden: { body: "form_only_component" },
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
      completeFields: Object.keys(completePatchByTag[tag]),
      defaults: clone(minimalCardsByTag[tag]),
      defaultValues: defaultValuesByTag[tag],
      invalid: cardWithPatch(tag, invalidPatch),
      invalidFields: Object.keys(invalidPatchByTag[tag]),
      expectedInvalidCodes: invalidCodesByTag[tag],
      preservedUnknownField: futureField,
      nesting: nestingByTag[tag],
      resource: {
        kind: resourceKind,
        modes: resourceKind === "none"
          ? []
          : ["missing", "resolved", "rejected", "aborted"],
      },
    }];
  }),
) as Record<CardComponentTag, TagCompatibilityFixture>;
