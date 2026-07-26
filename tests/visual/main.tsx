import React from "react";
import { createRoot } from "react-dom/client";

import { CardRenderer } from "../../src";
import {
  chartRendererCard,
  completeRendererCard,
} from "../../src/fixtures/renderer-cards";
import { completeContainerCard } from "../../src/fixtures/container-cards";
import { completeInteractiveCard } from "../../src/fixtures/interactive-card";
import "../../src/styles.css";

const interactiveCases = [
  { name: "default", width: "default", colorScheme: "light", device: "pc" },
  { name: "compact", width: "compact", colorScheme: "light", device: "pc" },
  { name: "fill", width: "fill", colorScheme: "light", device: "pc" },
  { name: "dark", width: "default", colorScheme: "dark", device: "pc" },
  { name: "mobile", width: "default", colorScheme: "light", device: "mobile" },
] as const;

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
      <section id="case-containers"><CardRenderer
        card={completeContainerCard} /></section>
      <section id="case-chart-light"><CardRenderer
        card={chartRendererCard} /></section>
      <section id="case-chart-dark"><CardRenderer colorScheme="dark"
        card={chartRendererCard} /></section>
      <section id="case-chart-mobile"><CardRenderer device="mobile"
        card={chartRendererCard} /></section>
      {interactiveCases.map(({ name, width, colorScheme, device }) => (
        <section id={`case-interactions-${name}`} key={`interactions-${name}`}
          style={device === "mobile" ? { maxWidth: 390 } : undefined}>
          <CardRenderer onAction={() => {}} colorScheme={colorScheme}
            device={device} card={{ ...completeInteractiveCard,
              config: { width_mode: width } }} />
        </section>
      ))}
    </main>
  </React.StrictMode>,
);
