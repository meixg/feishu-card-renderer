import type { ComponentType } from "react";

import { Div, Hr, Image, Markdown } from "../components/content/basic";
import {
  ImageCombination,
  Person,
  PersonList,
  Table,
} from "../components/content/complex";
import { Chart } from "../components/content/Chart";
import {
  CollapsiblePanel,
  Column,
  ColumnSet,
  Form,
  InteractiveContainer,
} from "../components/containers/containers";
import type { CardComponentTag, CardElement } from "../schema/components";
import {
  Button, Checker, Input, MultiSelect, Overflow, Picker, SelectImage,
  SingleSelect,
} from "../components/interactive/interactive";

type RendererProps<T extends CardElement = CardElement> = {
  element: T;
  path: string;
};

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
  input: Input as unknown as ComponentType<RendererProps>,
  button: Button as unknown as ComponentType<RendererProps>,
  overflow: Overflow as unknown as ComponentType<RendererProps>,
  select_static: SingleSelect as unknown as ComponentType<RendererProps>,
  multi_select_static: MultiSelect as unknown as ComponentType<RendererProps>,
  select_person: SingleSelect as unknown as ComponentType<RendererProps>,
  multi_select_person: MultiSelect as unknown as ComponentType<RendererProps>,
  date_picker: Picker as unknown as ComponentType<RendererProps>,
  picker_time: Picker as unknown as ComponentType<RendererProps>,
  picker_datetime: Picker as unknown as ComponentType<RendererProps>,
  select_img: SelectImage as unknown as ComponentType<RendererProps>,
  checker: Checker as unknown as ComponentType<RendererProps>,
};
