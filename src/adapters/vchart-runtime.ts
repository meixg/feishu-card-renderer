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

export function createChart(
  container: HTMLElement,
  spec: Record<string, unknown>,
  options: { colorScheme: "light" | "dark"; device: "pc" | "mobile" },
): ChartRuntimeInstance {
  const themedSpec = options.colorScheme === "dark" && spec.theme === undefined
    ? { ...spec, theme: "dark" }
    : spec;
  const chart = new VChart(themedSpec as unknown as ISpec, {
    dom: container,
    mode: options.device === "mobile" ? "mobile-browser" : "desktop-browser",
    autoFit: true,
    animation: false,
  });
  chart.renderSync();
  return {
    update(nextSpec) {
      const nextThemedSpec = options.colorScheme === "dark" &&
          nextSpec.theme === undefined
        ? { ...nextSpec, theme: "dark" }
        : nextSpec;
      chart.updateSpecSync(nextThemedSpec as unknown as ISpec);
    },
    release() {
      chart.release();
    },
  };
}
