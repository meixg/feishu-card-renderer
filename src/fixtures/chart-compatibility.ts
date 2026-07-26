import {
  FEISHU_CHART_TYPES,
  FEISHU_MOBILE_CHART_LIMITATIONS,
} from "../adapters/chart";
import type { Card } from "../schema/card";

export const feishuChartCardsByType = FEISHU_CHART_TYPES.reduce(
  (cards, type) => {
    cards[type] = {
    schema: "2.0",
    body: {
      elements: [{
        tag: "chart",
        chart_spec: {
          type,
          data: [{ id: "data", values: [
            { category: "A", value: 1 },
            { category: "B", value: 2 },
          ] }],
          media: [],
        },
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
