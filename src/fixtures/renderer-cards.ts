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
