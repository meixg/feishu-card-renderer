import {
  FEISHU_CHART_TYPES,
  FEISHU_MOBILE_CHART_LIMITATIONS,
} from "../adapters/chart";
import type { Card } from "../schema/card";

const categoricalValues = [
  { category: "A", value: 1 },
  { category: "B", value: 2 },
];

const chartSpecByType: Record<
  (typeof FEISHU_CHART_TYPES)[number],
  Record<string, unknown>
> = {
  line: {
    type: "line", data: [{ id: "data", values: categoricalValues }],
    xField: "category", yField: "value", media: [],
  },
  area: {
    type: "area", data: [{ id: "data", values: categoricalValues }],
    xField: "category", yField: "value", media: [],
  },
  bar: {
    type: "bar", data: [{ id: "data", values: categoricalValues }],
    xField: "category", yField: "value", media: [],
  },
  pie: {
    type: "pie", data: [{ id: "data", values: categoricalValues }],
    categoryField: "category", valueField: "value", media: [],
  },
  common: {
    type: "common",
    data: [{ id: "data", values: categoricalValues }],
    series: [{
      type: "bar", data: { id: "data" },
      xField: "category", yField: "value",
    }],
    media: [],
  },
  funnel: {
    type: "funnel", data: [{ id: "data", values: categoricalValues }],
    categoryField: "category", valueField: "value", media: [],
  },
  scatter: {
    type: "scatter",
    data: [{ id: "data", values: [
      { x: 1, y: 2 }, { x: 2, y: 1 },
    ] }],
    xField: "x", yField: "y", media: [],
  },
  radar: {
    type: "radar", data: [{ id: "data", values: categoricalValues }],
    categoryField: "category", valueField: "value", media: [],
  },
  linearProgress: {
    type: "linearProgress",
    data: [{ id: "data", values: [{ name: "Done", value: 0.65 }] }],
    direction: "horizontal", xField: "value", yField: "name",
    media: [],
  },
  circularProgress: {
    type: "circularProgress",
    data: [{ id: "data", values: [{ name: "Done", value: 0.65 }] }],
    categoryField: "name", valueField: "value", media: [],
  },
  wordCloud: {
    type: "wordCloud",
    data: [{ id: "data", values: [
      { name: "Feishu", value: 10 },
      { name: "Card", value: 8 },
      { name: "Renderer", value: 6 },
    ] }],
    nameField: "name", valueField: "value", media: [],
  },
};

export const feishuChartCardsByType = FEISHU_CHART_TYPES.reduce(
  (cards, type) => {
    cards[type] = {
    schema: "2.0",
    body: {
      elements: [{
        tag: "chart",
        chart_spec: chartSpecByType[type],
      }],
    },
    } satisfies Card;
    return cards;
  },
  {} as Record<(typeof FEISHU_CHART_TYPES)[number], Card>,
);

export const feishuChartCompatibility = {
  chartTypes: FEISHU_CHART_TYPES,
  mobileLimitations: FEISHU_MOBILE_CHART_LIMITATIONS,
  media: {
    feishuAddsDefaults: true,
    disableImplicitDefaultsWith: { media: [] },
    rendererReplicatesImplicitDefaults: false,
  },
  documentedClientBaseline: "VChart 1.12.3 for Feishu client 7.27+",
  rendererDependencyBaseline: "@visactor/vchart 2.x",
} as const;
