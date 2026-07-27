import type { Card } from "../schema/card";
import { completeComplexContentCard } from "./complex-content";

export const minimalRendererCard: Card = {
  schema: "2.0",
  body: { elements: [{ tag: "div", text: { tag: "plain_text", content: "正文" } }] },
};

export const completeRendererCard: Card = {
  schema: "2.0",
  config: { width_mode: "default", update_multi: true },
  header: {
    title: { tag: "plain_text", content: "通知标题" },
    subtitle: { tag: "lark_md", content: "**安全**副标题" },
    padding: "16px 20px",
  },
  body: {
    direction: "vertical",
    padding: "16px 20px",
    vertical_spacing: "medium",
    elements: [
      { tag: "div", margin: "0px", text: { tag: "lark_md", content: "**重点** [详情](https://example.com)" } },
      { tag: "markdown", content: "# Markdown\n`code` 与长文本" },
      { tag: "img", img_key: "cover", alt: { tag: "plain_text", content: "封面" }, corner_radius: "8px" },
      { tag: "hr", margin: "4px 0px" },
      ...(completeComplexContentCard.body?.elements ?? []),
    ],
  },
};

export const invalidRendererCard = {
  schema: "2.0",
  config: { width_mode: "huge" },
  body: {
    padding: "1px 2px 3px; color:red",
    elements: [
      { tag: "markdown", content: "<script>alert(1)</script> [x](javascript:alert(1))" },
      { tag: "future_secret_widget", secret: "must-not-render" },
      { tag: "img", img_key: "private-key" },
    ],
  },
} as const;

export const minimalMarkdownCard: Card = {
  schema: "2.0",
  body: { elements: [{ tag: "markdown", content: "A paragraph." }] },
};

export const completeMarkdownFoundationCard: Card = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "markdown",
      content: [
        "# 基础语义",
        "",
        "段落包含 *强调*、**粗体**、~~删除线~~和[安全链接](https://example.com)。",
        "",
        "- 无序项",
        "  1. 嵌套有序项",
        "",
        "> 引用内容",
        "",
        "---",
      ].join("\n"),
    }],
  },
};

export const completeMarkdownCodeTasksCard: Card = {
  schema: "2.0",
  config: { width_mode: "compact", update_multi: true },
  body: {
    elements: [{
      tag: "markdown",
      content: [
        "行内代码 `a_very_long_identifier_without_breaks_and_without_spaces` 可安全断行。",
        "",
        "```typescript",
        "const veryLongValue = 'abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz';",
        "  console.log(veryLongValue);",
        "```",
        "",
        "    indented line",
        "      preserved indentation",
        "",
        "- [ ] 待处理任务",
        "  - [x] 已完成的嵌套任务",
        "- 普通列表项",
      ].join("\n"),
    }],
  },
};

export const invalidMarkdownFoundationCard = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "markdown",
      content: "<future-tag>可见原文</future-tag>\n\n"
        + "![替代文本](https://tracker.example/image.png)\n\n"
        + "[危险链接](javascript:alert(1))",
    }],
  },
} as const;

export const chartRendererCard: Card = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "chart",
      aspect_ratio: "16:9",
      color_theme: "brand",
      preview: true,
      chart_spec: {
        type: "bar",
        data: [{
          id: "sales",
          values: [
            { month: "一月", value: 18 },
            { month: "二月", value: 31 },
            { month: "三月", value: 24 },
          ],
        }],
        xField: "month",
        yField: "value",
        media: [],
      },
    }],
  },
};
