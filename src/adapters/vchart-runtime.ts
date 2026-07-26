import VChart from "@visactor/vchart";
import type { ISpec } from "@visactor/vchart";

export type ChartRuntimeInstance = {
  update(spec: Record<string, unknown>): void;
  release(): void;
};

export type ChartRuntime = {
  createChart(
    container: HTMLElement,
    spec: Record<string, unknown>,
    options: { colorScheme: "light" | "dark"; device: "pc" | "mobile" },
  ): ChartRuntimeInstance;
};

function withColorScheme(
  spec: Record<string, unknown>,
  colorScheme: "light" | "dark",
): Record<string, unknown> {
  return colorScheme === "dark" && spec.theme === undefined
    ? { ...spec, theme: "dark" }
    : spec;
}

export function createChart(
  container: HTMLElement,
  spec: Record<string, unknown>,
  options: { colorScheme: "light" | "dark"; device: "pc" | "mobile" },
): ChartRuntimeInstance {
  const themedSpec = withColorScheme(spec, options.colorScheme);
  const chart = new VChart(themedSpec as unknown as ISpec, {
    dom: container,
    mode: options.device === "mobile" ? "mobile-browser" : "desktop-browser",
    autoFit: true,
    animation: false,
  });
  try {
    chart.renderSync();
  } catch (error) {
    chart.release();
    throw error;
  }
  return {
    update(nextSpec) {
      const nextThemedSpec = withColorScheme(nextSpec, options.colorScheme);
      chart.updateSpecSync(nextThemedSpec as unknown as ISpec);
    },
    release() {
      chart.release();
    },
  };
}
