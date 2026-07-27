import React from "react";
import { createRoot } from "react-dom/client";

import { CardRenderer } from "../../src";
import {
  chartRendererCard,
  completeMarkdownCodeTasksCard,
  completeRendererCard,
} from "../../src/fixtures/renderer-cards";
import { completeContainerCard } from "../../src/fixtures/container-cards";
import { completeComplexContentCard } from "../../src/fixtures/complex-content";
import { completeInteractiveCard } from "../../src/fixtures/interactive-card";
import {
  feishuChartCardsByType,
} from "../../src/fixtures/chart-compatibility";
import "../../src/styles.css";

const releaseMatrix = (["light", "dark"] as const).flatMap((colorScheme) =>
  (["pc", "mobile"] as const).flatMap((device) =>
    (["compact", "default", "fill"] as const).map((width) => ({
      name: `${colorScheme}-${device}-${width}`,
      width,
      colorScheme,
      device,
    }))));
const releaseAllTagsCard = {
  schema: "2.0" as const,
  header: completeRendererCard.header,
  body: {
    elements: [
      ...(completeRendererCard.body?.elements ?? []),
      ...(completeContainerCard.body?.elements ?? []),
      ...(completeComplexContentCard.body?.elements ?? []),
      ...(completeInteractiveCard.body?.elements ?? []),
    ],
  },
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <main style={{ display: "grid", gap: 24 }}>
      {(["default", "compact", "fill"] as const).map((width) => (
        <section id={`case-${width}`} key={width}>
          <CardRenderer card={{ ...completeRendererCard,
            config: { ...completeRendererCard.config, width_mode: width } }} />
        </section>
      ))}
      <section id="case-dark"><CardRenderer colorScheme="dark"
        card={completeRendererCard} /></section>
      <section id="case-mobile"><CardRenderer device="mobile"
        card={completeRendererCard} /></section>
      <section id="case-markdown-code-tasks" style={{ width: 280 }}>
        <CardRenderer device="mobile" card={completeMarkdownCodeTasksCard} />
      </section>
      <section id="case-containers"><CardRenderer
        card={completeContainerCard} /></section>
      <section id="case-chart-light"><CardRenderer
        card={chartRendererCard} /></section>
      <section id="case-chart-dark"><CardRenderer colorScheme="dark"
        card={chartRendererCard} /></section>
      <section id="case-chart-mobile"><CardRenderer device="mobile"
        card={chartRendererCard} /></section>
      <section id="case-chart-compatibility">
        {Object.entries(feishuChartCardsByType).map(([type, card]) => (
          <div data-chart-type={type} key={type}
            style={{ width: 360, minHeight: 220 }}>
            <CardRenderer card={card} />
          </div>
        ))}
      </section>
      {releaseMatrix.map(({ name, width, colorScheme, device }) => (
        <section id={`case-matrix-${name}`} key={`matrix-${name}`}
          style={device === "mobile" ? { maxWidth: 390 } : undefined}>
          <CardRenderer onAction={() => {}} colorScheme={colorScheme}
            device={device} card={{ ...releaseAllTagsCard,
              config: { update_multi: true, width_mode: width } }} />
        </section>
      ))}
    </main>
  </React.StrictMode>,
);
