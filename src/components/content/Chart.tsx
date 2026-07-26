import { useEffect, useMemo, useRef, useState } from "react";

import { sanitizeChartSpec } from "../../adapters/chart";
import {
  loadVChartRuntime,
  type ChartRuntimeInstance,
} from "../../adapters/vchart-loader";
import { useRendererContext } from "../../renderer/context";
import type { ChartElement } from "../../schema/components";
import { safeChartHeight } from "../../schema/style-policy";
import { safeBox } from "../../styles/safe";
import { PreviewDialog } from "../primitives/PreviewDialog";

const RATIOS: Record<string, string> = {
  "1:1": "1 / 1",
  "2:1": "2 / 1",
  "4:3": "4 / 3",
  "16:9": "16 / 9",
};

function ChartSurface({ element, label }: {
  element: ChartElement;
  label: string;
}): React.JSX.Element {
  const context = useRendererContext();
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<ChartRuntimeInstance | undefined>(undefined);
  const [state, setState] = useState<"loading" | "ready" | "unsafe" | "error">(
    "loading",
  );
  const chartSpecDescriptor = Object.getOwnPropertyDescriptor(
    element,
    "chart_spec",
  );
  const chartSpec = chartSpecDescriptor && "value" in chartSpecDescriptor
    ? chartSpecDescriptor.value
    : chartSpecDescriptor?.get;
  const safeSpec = useMemo(
    () => sanitizeChartSpec(chartSpec),
    [chartSpec],
  );

  useEffect(() => {
    if (!safeSpec.ok || !container.current) {
      setState("unsafe");
      return;
    }
    let cancelled = false;
    setState("loading");
    void loadVChartRuntime()
      .then((runtime) => {
        if (cancelled || !container.current) return;
        instance.current = runtime.createChart(container.current, safeSpec.spec, {
          colorScheme: context.colorScheme,
          device: context.device,
        });
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
      instance.current?.release();
      instance.current = undefined;
    };
  }, [context.colorScheme, context.device, safeSpec]);

  const height = safeChartHeight(element.height);
  return (
    <figure
      className="fcr-chart fcr-chart-result"
      data-chart-result="safe"
      data-device={context.device}
      data-state={state}
      role="img"
      aria-label={label}
      style={{
        margin: safeBox(element.margin, true),
        height,
        aspectRatio: height ? undefined : RATIOS[element.aspect_ratio ?? "16:9"],
      }}
    >
      <div ref={container} className="fcr-chart-canvas" aria-hidden="true" />
      {state !== "ready" && (
        <div className="fcr-chart-placeholder" aria-hidden="true">
          {state === "unsafe" ? "图表配置不安全" : state === "error"
            ? "图表加载失败" : "图表加载中"}
        </div>
      )}
    </figure>
  );
}

export function Chart({ element }: { element: ChartElement }): React.JSX.Element {
  const result = <ChartSurface element={element} label="图表" />;
  return element.preview === true
    ? <PreviewDialog label="打开图表预览" items={[{
      label: "图表预览",
      content: <ChartSurface element={element} label="图表预览" />,
    }]}>{result}</PreviewDialog>
    : result;
}
