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
