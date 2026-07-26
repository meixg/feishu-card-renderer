import type { Card } from "../schema/card";

const text = (content: string) => ({
  tag: "div" as const,
  text: { tag: "plain_text" as const, content },
});

const submit = {
  tag: "button" as const,
  name: "submit",
  form_action_type: "submit" as const,
  text: { tag: "plain_text" as const, content: "提交" },
};

function cardWith(element: unknown): Card {
  return {
    schema: "2.0",
    body: { elements: [element] },
  } as Card;
}

export const containerFixtureMatrix = {
  column_set: {
    minimal: cardWith({
      tag: "column_set",
      columns: [{ tag: "column", elements: [] }],
    }),
    complete: cardWith({
      tag: "column_set",
      element_id: "complete_columns",
      horizontal_spacing: "large",
      horizontal_align: "center",
      flex_mode: "stretch",
      columns: [{
        tag: "column",
        width: "weighted",
        weight: 2,
        direction: "horizontal",
        horizontal_spacing: "small",
        horizontal_align: "right",
        vertical_align: "center",
        padding: "8px",
        elements: [text("完整分栏")],
      }],
    }),
    default: cardWith({
      tag: "column_set",
      columns: [{ tag: "column", elements: [text("分栏默认值")] }],
    }),
    invalid: cardWith({
      tag: "column_set",
      horizontal_align: "diagonal",
      future_column_set: { retained: true },
      columns: [{ tag: "column", elements: [] }],
    }),
  },
  column: {
    minimal: cardWith({
      tag: "column_set",
      columns: [{ tag: "column", elements: [] }],
    }),
    complete: cardWith({
      tag: "column_set",
      columns: [{
        tag: "column",
        element_id: "complete_column",
        width: "weighted",
        weight: 3,
        direction: "horizontal",
        horizontal_spacing: "medium",
        vertical_spacing: "large",
        horizontal_align: "center",
        vertical_align: "bottom",
        padding: "4px 8px",
        elements: [text("完整列")],
      }],
    }),
    default: cardWith({
      tag: "column_set",
      columns: [{ tag: "column", elements: [text("列默认值")] }],
    }),
    invalid: cardWith({
      tag: "column_set",
      columns: [{
        tag: "column",
        direction: "diagonal",
        future_column: { retained: true },
        elements: [],
      }],
    }),
  },
  interactive_container: {
    minimal: cardWith({ tag: "interactive_container", elements: [] }),
    complete: cardWith({
      tag: "interactive_container",
      element_id: "complete_interactive",
      direction: "horizontal",
      horizontal_spacing: "medium",
      vertical_spacing: "large",
      horizontal_align: "center",
      vertical_align: "bottom",
      padding: "12px",
      has_border: true,
      corner_radius: "8px",
      behaviors: [{ type: "callback", value: { action: "later" } }],
      elements: [text("完整交互容器")],
    }),
    default: cardWith({
      tag: "interactive_container",
      elements: [text("交互容器默认值")],
    }),
    invalid: cardWith({
      tag: "interactive_container",
      vertical_align: "sideways",
      future_interactive_container: { retained: true },
      elements: [],
    }),
  },
  collapsible_panel: {
    minimal: cardWith({ tag: "collapsible_panel", elements: [] }),
    complete: cardWith({
      tag: "collapsible_panel",
      element_id: "complete_panel",
      expanded: true,
      header: {
        title: { tag: "plain_text", content: "完整面板" },
        position: "bottom",
        icon_position: "right",
      },
      border: { color: "grey", corner_radius: "8px" },
      elements: [text("完整折叠内容")],
    }),
    default: cardWith({
      tag: "collapsible_panel",
      elements: [text("面板默认值")],
    }),
    invalid: cardWith({
      tag: "collapsible_panel",
      header: {
        title: { tag: "plain_text", content: "非法面板" },
        position: "sideways",
      },
      future_collapsible_panel: { retained: true },
      elements: [],
    }),
  },
  form: {
    minimal: cardWith({
      tag: "form",
      name: "minimal_matrix_form",
      elements: [submit],
    }),
    complete: cardWith({
      tag: "form",
      element_id: "complete_form",
      name: "complete_matrix_form",
      direction: "horizontal",
      horizontal_spacing: "medium",
      vertical_spacing: "large",
      horizontal_align: "right",
      vertical_align: "center",
      elements: [text("完整表单"), submit],
    }),
    default: cardWith({
      tag: "form",
      name: "default_matrix_form",
      elements: [text("表单默认值"), submit],
    }),
    invalid: cardWith({
      tag: "form",
      name: "invalid_matrix_form",
      horizontal_align: "diagonal",
      future_form: { retained: true },
      elements: [submit],
    }),
  },
} as const;

export const minimalContainerCard: Card = {
  schema: "2.0",
  body: {
    elements: [
      { tag: "column_set", columns: [{ tag: "column", elements: [] }] },
      { tag: "interactive_container", elements: [] },
      { tag: "collapsible_panel", elements: [] },
      { tag: "form", name: "minimal_form", elements: [submit] },
    ],
  },
};

export const completeContainerCard: Card = {
  schema: "2.0",
  body: {
    vertical_spacing: "medium",
    elements: [
      {
        tag: "column_set",
        element_id: "columns",
        horizontal_spacing: "large",
        horizontal_align: "center",
        flex_mode: "stretch",
        columns: [
          {
            tag: "column",
            element_id: "left",
            width: "weighted",
            weight: 2,
            padding: "8px",
            vertical_spacing: "small",
            elements: [text("左栏")],
          },
          {
            tag: "column",
            element_id: "right",
            width: "weighted",
            weight: 1,
            elements: [text("右栏")],
          },
        ],
      },
      {
        tag: "interactive_container",
        element_id: "interactive",
        has_border: true,
        corner_radius: "8px",
        padding: "12px",
        behaviors: [{ type: "callback", value: { action: "later" } }],
        elements: [
          {
            tag: "interactive_container",
            element_id: "child_interactive",
            behaviors: [{ type: "callback" }],
            elements: [text("子交互优先")],
          },
        ],
      },
      {
        tag: "collapsible_panel",
        element_id: "details",
        expanded: false,
        header: {
          title: { tag: "plain_text", content: "更多信息" },
          position: "top",
          icon_position: "right",
        },
        border: { color: "grey", corner_radius: "8px" },
        elements: [text("折叠内容")],
      },
      {
        tag: "form",
        element_id: "form_shell",
        name: "profile",
        vertical_spacing: "small",
        elements: [text("表单骨架"), submit],
      },
    ],
  },
};

export const defaultContainerCard: Card = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "collapsible_panel",
      header: { title: { tag: "plain_text", content: "默认折叠" } },
      elements: [text("默认隐藏")],
    }],
  },
};

export const invalidContainerCard = {
  schema: "2.0",
  body: {
    elements: [
      {
        tag: "column_set",
        columns: [{ tag: "column", elements: [{ tag: "table" }] }],
      },
      {
        tag: "interactive_container",
        elements: [{ tag: "form", name: "nested", elements: [] }],
      },
      {
        tag: "collapsible_panel",
        elements: [{ tag: "form", name: "nested_panel", elements: [] }],
      },
      {
        tag: "form",
        name: "conservative",
        elements: [{ tag: "chart", chart_spec: {} }],
      },
    ],
  },
} as const;

function nestedPanel(levels: number): unknown {
  return levels === 0
    ? text("叶子")
    : {
        tag: "collapsible_panel",
        expanded: true,
        header: {
          title: { tag: "plain_text", content: `第 ${levels} 层` },
        },
        elements: [nestedPanel(levels - 1)],
      };
}

export const fiveLevelContainerCard = {
  schema: "2.0",
  body: { elements: [nestedPanel(5)] },
} as const;

export const sixLevelContainerCard = {
  schema: "2.0",
  body: { elements: [nestedPanel(6)] },
} as const;
