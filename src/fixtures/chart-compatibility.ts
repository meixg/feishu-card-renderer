import {
  FEISHU_CHART_TYPES,
  FEISHU_MOBILE_CHART_LIMITATIONS,
} from "../adapters/chart";

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
