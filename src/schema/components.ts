export const CARD_COMPONENT_TAGS = [
  "column_set",
  "column",
  "form",
  "interactive_container",
  "collapsible_panel",
  "div",
  "markdown",
  "img",
  "img_combination",
  "person",
  "person_list",
  "chart",
  "table",
  "hr",
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
] as const;

export type CardComponentTag = (typeof CARD_COMPONENT_TAGS)[number];

export const AUXILIARY_TAGS = [
  "plain_text",
  "lark_md",
  "standard_icon",
  "custom_icon",
  "text_tag",
] as const;

export type TextElement = {
  tag: "plain_text" | "lark_md";
  content: string;
  element_id?: string;
  [key: string]: unknown;
};

export type BaseElement<TTag extends CardComponentTag> = {
  tag: TTag;
  element_id?: string;
  [key: string]: unknown;
};

export type ColumnSetElement = BaseElement<"column_set"> & {
  columns: ColumnElement[];
};
export type ColumnElement = BaseElement<"column"> & {
  elements: CardElement[];
};
export type FormElement = BaseElement<"form"> & {
  name: string;
  elements: CardElement[];
};
export type InteractiveContainerElement =
  BaseElement<"interactive_container"> & { elements: CardElement[] };
export type CollapsiblePanelElement = BaseElement<"collapsible_panel"> & {
  elements: CardElement[];
};
export type DivElement = BaseElement<"div"> & {
  text?: TextElement;
  margin?: string;
};
export type MarkdownElement = BaseElement<"markdown"> & { content?: string };
export type ImageElement = BaseElement<"img"> & {
  img_key?: string;
  alt?: TextElement;
  title?: TextElement;
  margin?: string;
  corner_radius?: string;
};
export type ImageCombinationElement = BaseElement<"img_combination"> & {
  img_list?: unknown[];
};
export type PersonElement = BaseElement<"person"> & { user_id?: string };
export type PersonListElement = BaseElement<"person_list"> & {
  persons?: unknown[];
};
export type ChartElement = BaseElement<"chart"> & {
  chart_spec?: Record<string, unknown>;
};
export type TableElement = BaseElement<"table"> & {
  columns?: unknown[];
  rows?: unknown[];
};
export type HrElement = BaseElement<"hr">;
export type InputElement = BaseElement<"input"> & { name?: string };
export type ButtonElement = BaseElement<"button"> & {
  name?: string;
  form_action_type?: "submit" | "reset";
  text?: TextElement;
};
export type OverflowElement = BaseElement<"overflow"> & { name?: string };
export type SelectStaticElement = BaseElement<"select_static"> & {
  name?: string;
};
export type MultiSelectStaticElement = BaseElement<"multi_select_static"> & {
  name?: string;
};
export type SelectPersonElement = BaseElement<"select_person"> & {
  name?: string;
};
export type MultiSelectPersonElement = BaseElement<"multi_select_person"> & {
  name?: string;
};
export type DatePickerElement = BaseElement<"date_picker"> & { name?: string };
export type TimePickerElement = BaseElement<"picker_time"> & { name?: string };
export type DateTimePickerElement = BaseElement<"picker_datetime"> & {
  name?: string;
};
export type SelectImageElement = BaseElement<"select_img"> & {
  name?: string;
  multi_select?: boolean;
};
export type CheckerElement = BaseElement<"checker"> & { name?: string };

export type CardElement =
  | ColumnSetElement
  | ColumnElement
  | FormElement
  | InteractiveContainerElement
  | CollapsiblePanelElement
  | DivElement
  | MarkdownElement
  | ImageElement
  | ImageCombinationElement
  | PersonElement
  | PersonListElement
  | ChartElement
  | TableElement
  | HrElement
  | InputElement
  | ButtonElement
  | OverflowElement
  | SelectStaticElement
  | MultiSelectStaticElement
  | SelectPersonElement
  | MultiSelectPersonElement
  | DatePickerElement
  | TimePickerElement
  | DateTimePickerElement
  | SelectImageElement
  | CheckerElement;

export type UnsupportedCardElement = {
  tag: "__unsupported";
  originalTag: string;
  reason: "component_limit" | "container_depth";
  path: string;
};

export const CONTAINER_TAGS = new Set<string>([
  "column_set",
  "column",
  "form",
  "interactive_container",
  "collapsible_panel",
]);

export const KNOWN_TAGS = new Set<string>([
  ...CARD_COMPONENT_TAGS,
  ...AUXILIARY_TAGS,
]);

export function isCardComponentTag(value: unknown): value is CardComponentTag {
  return typeof value === "string" && KNOWN_TAGS.has(value) &&
    (CARD_COMPONENT_TAGS as readonly string[]).includes(value);
}

export type RuntimeTagSchema<TTag extends CardComponentTag> = {
  readonly tag: TTag;
  is(value: unknown): value is Extract<CardElement, { tag: TTag }>;
};

function isTaggedRecord<TTag extends CardComponentTag>(
  value: unknown,
  tag: TTag,
): value is Extract<CardElement, { tag: TTag }> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value) && (value as { tag?: unknown }).tag === tag;
}

export const CARD_COMPONENT_SCHEMAS = Object.fromEntries(
  CARD_COMPONENT_TAGS.map((tag) => [
    tag,
    {
      tag,
      is: (value: unknown) => isTaggedRecord(value, tag),
    },
  ]),
) as {
  [TTag in CardComponentTag]: RuntimeTagSchema<TTag>;
};

export function isCardElement(value: unknown): value is CardElement {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const tag = (value as { tag?: unknown }).tag;
  return isCardComponentTag(tag) && CARD_COMPONENT_SCHEMAS[tag].is(value);
}
