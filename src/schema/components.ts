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

export type StandardIcon = {
  tag: "standard_icon";
  token: string;
  color?: string;
  [key: string]: unknown;
};

export type CustomIcon = {
  tag: "custom_icon";
  img_key: string;
  [key: string]: unknown;
};

export type CardIcon = StandardIcon | CustomIcon;

export type BaseElement<TTag extends CardComponentTag> = {
  tag: TTag;
  element_id?: string;
  [key: string]: unknown;
};

export type ColumnSetElement = BaseElement<"column_set"> & {
  columns: ColumnElement[];
  direction?: "vertical" | "horizontal";
  horizontal_spacing?: string;
  horizontal_align?: "left" | "center" | "right";
  flex_mode?: string;
};
export type ColumnElement = BaseElement<"column"> & {
  elements: CardElement[];
  width?: string;
  weight?: number;
  direction?: "vertical" | "horizontal";
  horizontal_spacing?: string;
  vertical_spacing?: string;
  horizontal_align?: "left" | "center" | "right";
  vertical_align?: "top" | "center" | "bottom";
  padding?: string;
};
export type FormElement = BaseElement<"form"> & {
  name: string;
  elements: CardElement[];
  direction?: "vertical" | "horizontal";
  horizontal_spacing?: string;
  vertical_spacing?: string;
  horizontal_align?: "left" | "center" | "right";
  vertical_align?: "top" | "center" | "bottom";
};
export type InteractiveContainerElement =
  BaseElement<"interactive_container"> & {
    elements: CardElement[];
    behaviors?: unknown[];
    direction?: "vertical" | "horizontal";
    horizontal_spacing?: string;
    vertical_spacing?: string;
    horizontal_align?: "left" | "center" | "right";
    vertical_align?: "top" | "center" | "bottom";
    padding?: string;
    has_border?: boolean;
    corner_radius?: string;
  };
export type CollapsiblePanelElement = BaseElement<"collapsible_panel"> & {
  elements: CardElement[];
  expanded?: boolean;
  header?: {
    title?: TextElement;
    position?: "top" | "bottom";
    icon_position?: "left" | "right";
    [key: string]: unknown;
  };
  border?: {
    color?: string;
    corner_radius?: string;
    [key: string]: unknown;
  };
};
export type DivElement = BaseElement<"div"> & {
  text?: TextElement;
  margin?: string;
};
export type MarkdownElement = BaseElement<"markdown"> & {
  content?: string;
  text_size?: string;
  text_align?: "left" | "center" | "right";
  icon?: CardIcon;
  margin?: string;
};
export type ImageElement = BaseElement<"img"> & {
  img_key?: string;
  alt?: TextElement;
  title?: TextElement;
  margin?: string;
  corner_radius?: string;
  preview?: boolean;
};
export type CombinationImage = {
  img_key?: string;
  alt?: TextElement;
  transparent?: boolean;
  [key: string]: unknown;
};
export type ImageCombinationElement = BaseElement<"img_combination"> & {
  combination_mode?: "double" | "triple" | "bisect" | "trisect";
  combination_transparent?: boolean;
  corner_radius?: string;
  img_list?: CombinationImage[];
};
export type PersonElement = BaseElement<"person"> & {
  user_id?: string;
  size?: "small" | "medium" | "large";
  show_avatar?: boolean;
  show_name?: boolean;
  style?: "normal" | "capsule";
};
export type PersonItem = { id?: string; [key: string]: unknown };
export type PersonListElement = BaseElement<"person_list"> & {
  persons?: PersonItem[];
  drop_invalid_user_id?: boolean;
  lines?: number;
  size?: "small" | "medium" | "large";
  show_avatar?: boolean;
  show_name?: boolean;
};
export type ChartElement = BaseElement<"chart"> & {
  chart_spec?: Record<string, unknown>;
  preview?: boolean;
  aspect_ratio?: "1:1" | "2:1" | "4:3" | "16:9";
  color_theme?: string;
  height?: string;
  margin?: string;
};
export type TableColumn = {
  name?: string;
  display_name?: string;
  data_type?: "text" | "lark_md" | "options" | "number" | "persons" | "date" | "markdown";
  width?: string;
  format?: {
    symbol?: string;
    precision?: number;
    separator?: boolean;
    date_format?: string;
  };
  [key: string]: unknown;
};
export type TableElement = BaseElement<"table"> & {
  columns?: TableColumn[];
  rows?: Record<string, unknown>[];
  page_size?: number;
  row_height?: "low" | "medium" | "high";
  freeze_first_column?: boolean;
  header_style?: Record<string, unknown>;
};
export type HrElement = BaseElement<"hr">;
export type InteractiveBase<T extends CardComponentTag> = BaseElement<T> & {
  name?: string;
  disabled?: boolean;
  required?: boolean;
  behaviors?: unknown[];
  value?: unknown;
  confirm?: { title?: TextElement; text?: TextElement };
  label?: TextElement;
  placeholder?: TextElement;
  hover_tips?: TextElement;
  disabled_tips?: TextElement;
};
export type OptionValue =
  | string
  | number
  | boolean
  | null
  | OptionValue[]
  | { [key: string]: OptionValue };
export type SelectOption = {
  text?: TextElement;
  value?: OptionValue;
  img_key?: string;
  disabled?: boolean;
  behaviors?: unknown[];
  multi_url?: { url?: string; pc_url?: string; default_url?: string };
  [key: string]: unknown;
};
export type InputElement = InteractiveBase<"input"> & {
  default_value?: string; input_type?: "text" | "multiline_text" | "password";
  max_length?: number; rows?: number;
};
export type ButtonElement = InteractiveBase<"button"> & {
  form_action_type?: "submit" | "reset";
  text?: TextElement;
};
export type OverflowElement = InteractiveBase<"overflow"> & {
  options?: SelectOption[];
};
export type SelectStaticElement = InteractiveBase<"select_static"> & {
  options?: SelectOption[]; initial_option?: OptionValue; initial_index?: number;
};
export type MultiSelectStaticElement = InteractiveBase<"multi_select_static"> & {
  options?: SelectOption[]; selected_values?: OptionValue[];
};
export type SelectPersonElement = InteractiveBase<"select_person"> & {
  options?: SelectOption[]; initial_option?: OptionValue; initial_index?: number;
};
export type MultiSelectPersonElement = InteractiveBase<"multi_select_person"> & {
  options?: SelectOption[]; selected_values?: OptionValue[];
};
export type DatePickerElement = InteractiveBase<"date_picker"> & {
  initial_date?: string;
};
export type TimePickerElement = InteractiveBase<"picker_time"> & {
  initial_time?: string;
};
export type DateTimePickerElement = InteractiveBase<"picker_datetime"> & {
  initial_datetime?: string;
};
export type SelectImageElement = InteractiveBase<"select_img"> & {
  multi_select?: boolean;
  options?: SelectOption[]; selected_values?: OptionValue[];
};
export type CheckerElement = InteractiveBase<"checker"> & {
  checked?: boolean; text?: TextElement;
};

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
  reason: "component_limit" | "container_depth" | "invalid_nesting";
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
