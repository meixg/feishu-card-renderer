/* eslint-disable react-refresh/only-export-components */
import type { ComponentType } from "react";

import { Div, Hr, Image, Markdown } from "../components/content/basic";
import type { CardComponentTag, CardElement } from "../schema/components";
import { UnknownComponent } from "./UnknownComponent";

type RendererProps<T extends CardElement = CardElement> = {
  element: T;
  path: string;
};

const Placeholder = ({ element, path }: RendererProps): React.JSX.Element =>
  <UnknownComponent tag={element.tag} path={path} />;

export const registry: Record<CardComponentTag, ComponentType<RendererProps>> = {
  div: Div as unknown as ComponentType<RendererProps>,
  markdown: Markdown as unknown as ComponentType<RendererProps>,
  img: Image as unknown as ComponentType<RendererProps>,
  hr: Hr as unknown as ComponentType<RendererProps>,
  column_set: Placeholder,
  column: Placeholder,
  form: Placeholder,
  interactive_container: Placeholder,
  collapsible_panel: Placeholder,
  img_combination: Placeholder,
  person: Placeholder,
  person_list: Placeholder,
  chart: Placeholder,
  table: Placeholder,
  input: Placeholder,
  button: Placeholder,
  overflow: Placeholder,
  select_static: Placeholder,
  multi_select_static: Placeholder,
  select_person: Placeholder,
  multi_select_person: Placeholder,
  date_picker: Placeholder,
  picker_time: Placeholder,
  picker_datetime: Placeholder,
  select_img: Placeholder,
  checker: Placeholder,
};
