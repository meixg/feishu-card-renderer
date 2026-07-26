import type { Card } from "../schema/card";

const text = (content: string) => ({ tag: "plain_text" as const, content });
const option = (content: string, value: string) => ({ text: text(content), value });

export const completeInteractiveCard = {
  schema: "2.0",
  body: {
    elements: [{
      tag: "form",
      name: "profile",
      elements: [
        { tag: "input", name: "note", label: text("备注"), required: true,
          default_value: "初始值", max_length: 20,
          hover_tips: text("最多二十字"), disabled_tips: text("备注不可编辑") },
        { tag: "select_static", name: "kind", placeholder: text("类型"),
          initial_option: "a", options: [option("A", "a"), option("B", "b")] },
        { tag: "multi_select_static", name: "tags", selected_values: ["x"],
          options: [option("X", "x"), option("Y", "y")] },
        { tag: "select_person", name: "owner", options: [option("甲", "ou_a")] },
        { tag: "multi_select_person", name: "members", selected_values: ["ou_a"],
          options: [option("甲", "ou_a"), option("乙", "ou_b")] },
        { tag: "date_picker", name: "date", initial_date: "2026-07-27" },
        { tag: "picker_time", name: "time", initial_time: "09:30" },
        { tag: "picker_datetime", name: "at",
          initial_datetime: "2026-07-27 09:30" },
        { tag: "select_img", name: "images", multi_select: true,
          selected_values: ["one"], options: [
            { img_key: "one", value: "one", text: text("图一") },
            { img_key: "two", value: "two", text: text("图二") },
          ] },
        { tag: "checker", name: "agree", checked: true, text: text("同意") },
        { tag: "button", name: "reset", form_action_type: "reset", text: text("重置") },
        { tag: "button", name: "submit", form_action_type: "submit",
          text: text("提交"), value: { intent: "save" }, confirm: {
            title: text("确认提交"), text: text("是否继续？"),
          } },
      ],
    }, {
      tag: "interactive_container",
      behaviors: [{ type: "callback", value: { parent: true } }],
      elements: [{ tag: "button", text: text("立即执行"),
        behaviors: [
          { type: "callback", value: { child: true } },
          { type: "open_url", default_url: "https://default.example",
            pc_url: "https://pc.example" },
        ] }],
    }, {
      tag: "overflow",
      options: [{ text: text("菜单项"), value: { menu: 1 } }],
    }],
  },
} satisfies Card;

export const minimalInteractiveCards = [
  { tag: "input" }, { tag: "button", text: text("按钮") },
  { tag: "overflow", options: [] }, { tag: "select_static", options: [] },
  { tag: "multi_select_static", options: [] },
  { tag: "select_person", options: [] },
  { tag: "multi_select_person", options: [] }, { tag: "date_picker" },
  { tag: "picker_time" }, { tag: "picker_datetime" },
  { tag: "select_img", options: [] }, { tag: "checker" },
] as const;

export const interactiveCoverageByTag = {
  input: ["default_value", "native change"],
  button: ["text/value", "pointer + confirm keyboard"],
  overflow: ["options", "pointer + Enter/Esc"],
  select_static: ["initial_option", "native select keyboard"],
  multi_select_static: ["selected_values", "native multi-select keyboard"],
  select_person: ["initial_option/options", "native select keyboard"],
  multi_select_person: ["selected_values/options", "native multi-select keyboard"],
  date_picker: ["initial_date", "native date keyboard"],
  picker_time: ["initial_time", "native time keyboard"],
  picker_datetime: ["initial_datetime", "native datetime keyboard"],
  select_img: ["selected_values", "native radio/checkbox keyboard"],
  checker: ["checked", "native checkbox keyboard"],
} as const;
