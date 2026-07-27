import type { ChartRuntime } from "./vchart-runtime";

export type { ChartRuntime, ChartRuntimeInstance } from "./vchart-runtime";

export async function loadVChartRuntime(): Promise<ChartRuntime> {
  return import("./vchart-runtime");
}
