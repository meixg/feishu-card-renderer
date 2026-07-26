import type { Card } from "../schema/card";
import type { CardComponentTag } from "../schema/components";

const submitButton = {
  tag: "button" as const,
  name: "submit",
  form_action_type: "submit" as const,
  text: { tag: "plain_text" as const, content: "Submit" },
};

function cardWith(element: unknown): Card {
  return {
    schema: "2.0",
    body: { elements: [element] },
  } as Card;
}

export const minimalCardsByTag: Record<CardComponentTag, Card> = {
  column_set: cardWith({
    tag: "column_set",
    columns: [{ tag: "column", elements: [] }],
  }),
  column: cardWith({
    tag: "column_set",
    columns: [{ tag: "column", elements: [] }],
  }),
  form: cardWith({ tag: "form", name: "form", elements: [submitButton] }),
  interactive_container: cardWith({
    tag: "interactive_container",
    elements: [],
  }),
  collapsible_panel: cardWith({ tag: "collapsible_panel", elements: [] }),
  div: cardWith({
    tag: "div",
    text: { tag: "plain_text", content: "" },
  }),
  markdown: cardWith({ tag: "markdown", content: "" }),
  img: cardWith({ tag: "img", img_key: "img_key" }),
  img_combination: cardWith({ tag: "img_combination", img_list: [] }),
  person: cardWith({ tag: "person", user_id: "ou_id" }),
  person_list: cardWith({ tag: "person_list", persons: [] }),
  chart: cardWith({ tag: "chart", chart_spec: {} }),
  table: cardWith({ tag: "table", columns: [], rows: [] }),
  hr: cardWith({ tag: "hr" }),
  input: cardWith({ tag: "input" }),
  button: cardWith({
    tag: "button",
    text: { tag: "plain_text", content: "Button" },
  }),
  overflow: cardWith({ tag: "overflow", options: [] }),
  select_static: cardWith({ tag: "select_static", options: [] }),
  multi_select_static: cardWith({
    tag: "form",
    name: "form",
    elements: [
      { tag: "multi_select_static", name: "field", options: [] },
      submitButton,
    ],
  }),
  select_person: cardWith({ tag: "select_person", options: [] }),
  multi_select_person: cardWith({
    tag: "form",
    name: "form",
    elements: [
      { tag: "multi_select_person", name: "field", options: [] },
      submitButton,
    ],
  }),
  date_picker: cardWith({ tag: "date_picker" }),
  picker_time: cardWith({ tag: "picker_time" }),
  picker_datetime: cardWith({ tag: "picker_datetime" }),
  select_img: cardWith({ tag: "select_img", options: [] }),
  checker: cardWith({ tag: "checker" }),
};

export const cardWithEveryComponent: Card = {
  schema: "2.0",
  config: { update_multi: true, width_mode: "default" },
  header: {
    title: { tag: "plain_text", content: "All components" },
  },
  body: {
    elements: [
      ...Object.values(minimalCardsByTag)
        .flatMap((card) => card.body?.elements ?? []),
    ],
  },
};
