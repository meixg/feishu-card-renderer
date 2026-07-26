import type { Card } from "../schema/card";

export const minimalComplexContentCard: Card = {
  schema: "2.0",
  body: { elements: [
    { tag: "img_combination", img_list: [{ img_key: "one" }] },
    { tag: "person", user_id: "person-a" },
    { tag: "person_list", persons: [{ id: "person-a" }] },
    { tag: "table", columns: [], rows: [] },
  ] },
};

export const completeComplexContentCard: Card = {
  schema: "2.0",
  config: { width_mode: "default", update_multi: true },
  body: { elements: [
    {
      tag: "img_combination", combination_mode: "triple",
      combination_transparent: false, corner_radius: "8px",
      img_list: [
        { img_key: "one", alt: { tag: "plain_text", content: "第一张" } },
        { img_key: "two", alt: { tag: "plain_text", content: "第二张" } },
        { img_key: "three", alt: { tag: "plain_text", content: "第三张" } },
      ],
    },
    { tag: "person", user_id: "person-a", size: "large",
      show_avatar: true, show_name: true, style: "capsule" },
    { tag: "person_list", persons: [{ id: "person-a" }, { id: "person-b" }],
      lines: 2, size: "small", show_avatar: true, show_name: true },
    {
      tag: "table", page_size: 1, row_height: "low",
      columns: [
        { name: "name", display_name: "名称", data_type: "text", width: "120px" },
        { name: "amount", display_name: "金额", data_type: "number",
          format: { symbol: "¥", precision: 2, separator: true } },
        { name: "when", display_name: "日期", data_type: "date" },
        { name: "owners", display_name: "人员", data_type: "persons" },
        { name: "note", display_name: "说明", data_type: "markdown" },
      ],
      rows: [
        { name: "项目 A", amount: 1234.5, when: "2026-07-26",
          owners: ["person-a"], note: "**正常**" },
        { name: "项目 B", amount: 2, when: "invalid",
          owners: ["person-b"], note: "[安全](https://example.com)" },
      ],
    },
    { tag: "chart", chart_spec: { type: "bar" }, preview: true },
  ] },
};

export const invalidComplexContentCard = {
  schema: "2.0",
  body: { elements: [
    { tag: "img_combination", combination_mode: "unknown",
      corner_radius: "8px; color:red", img_list: [{ img_key: "unsafe" }] },
    { tag: "person", user_id: "private-person", size: "huge" },
    { tag: "person_list", persons: [null, {}, { id: 2 }] },
    { tag: "table", page_size: 99, row_height: "giant",
      columns: [{ name: "x", data_type: "widget" }],
      rows: [{ x: { tag: "button", secret: "never render" } }] },
  ] },
} as const;
