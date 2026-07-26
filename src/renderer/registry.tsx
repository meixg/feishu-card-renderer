/* eslint-disable react-refresh/only-export-components */
import type { ComponentType } from "react";

import { Div, Hr, Image, Markdown } from "../components/content/basic";
import {
  Chart,
  ImageCombination,
  Person,
  PersonList,
  Table,
} from "../components/content/complex";
import {
  CollapsiblePanel,
  Column,
  ColumnSet,
  Form,
  InteractiveContainer,
} from "../components/containers/containers";
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
  column_set: ColumnSet as unknown as ComponentType<RendererProps>,
  column: Column as unknown as ComponentType<RendererProps>,
  form: Form as unknown as ComponentType<RendererProps>,
  interactive_container:
    InteractiveContainer as unknown as ComponentType<RendererProps>,
  collapsible_panel:
    CollapsiblePanel as unknown as ComponentType<RendererProps>,
  img_combination: ImageCombination as unknown as ComponentType<RendererProps>,
  person: Person as unknown as ComponentType<RendererProps>,
  person_list: PersonList as unknown as ComponentType<RendererProps>,
  chart: Chart as unknown as ComponentType<RendererProps>,
  table: Table as unknown as ComponentType<RendererProps>,
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
