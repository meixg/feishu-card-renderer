import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { CardRenderer } from "../../src";
import {
  chartRendererCard,
  completeMarkdownCodeTasksCard,
  completeMarkdownTableCard,
  completeMarkdownThemeCard,
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

export function OverlayCases(): React.JSX.Element {
  const [actions, setActions] = useState<unknown[]>([]);
  return (
    <section id="case-overlays">
      <CardRenderer
        resolveImage={(key) => `https://cdn.example.com/${key}.png`}
        onAction={(action) => setActions((current) => [...current, action])}
        card={{
          schema: "2.0",
          body: {
            elements: [
              {
                tag: "interactive_container",
                behaviors: [{
                  type: "callback",
                  value: { owner: "confirm-parent" },
                }],
                elements: [{
                  tag: "button",
                  text: { tag: "plain_text", content: "打开确认" },
                  confirm: {
                    title: { tag: "plain_text", content: "确认执行" },
                    text: { tag: "plain_text", content: "只执行一次？" },
                  },
                  behaviors: [{
                    type: "callback",
                    value: { owner: "confirm-child" },
                  }],
                }],
              },
              {
                tag: "interactive_container",
                behaviors: [{
                  type: "callback",
                  value: { owner: "container-parent" },
                }],
                elements: [{
                  tag: "overflow",
                  confirm: {
                    title: { tag: "plain_text", content: "确认菜单操作" },
                    text: { tag: "plain_text", content: "继续执行？" },
                  },
                  options: [
                    {
                      text: { tag: "plain_text", content: "第一项" },
                      value: { owner: "overflow-first" },
                    },
                    {
                      text: { tag: "plain_text", content: "禁用项" },
                      value: { owner: "overflow-disabled" },
                      disabled: true,
                    },
                    {
                      text: { tag: "plain_text", content: "最后项" },
                      value: { owner: "overflow-last" },
                    },
                  ],
                }],
              },
              {
                tag: "interactive_container",
                behaviors: [{
                  type: "callback",
                  value: { owner: "image-parent" },
                }],
                elements: [{
                  tag: "img_combination",
                  img_list: [
                    {
                      img_key: "overlay-one",
                      alt: { tag: "plain_text", content: "第一张" },
                    },
                    {
                      img_key: "overlay-two",
                      alt: { tag: "plain_text", content: "第二张" },
                    },
                  ],
                }],
              },
              {
                tag: "button",
                text: { tag: "plain_text", content: "不可操作" },
                disabled: true,
                hover_tips: {
                  tag: "plain_text",
                  content: "悬停提示也会内联显示",
                },
                disabled_tips: {
                  tag: "plain_text",
                  content: "当前操作已禁用",
                },
                behaviors: [{ type: "callback", value: "disabled" }],
              },
            ],
          },
        }}
      />
      <output id="overlay-actions">{JSON.stringify(actions)}</output>
    </section>
  );
}

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
      {releaseMatrix.map(({ name, width, colorScheme, device }) => (
        <section id={`case-markdown-theme-${name}`}
          key={`markdown-theme-${name}`}
          style={device === "mobile" ? { maxWidth: 390 } : undefined}>
          <CardRenderer colorScheme={colorScheme} device={device}
            card={{ ...completeMarkdownThemeCard,
              config: { ...completeMarkdownThemeCard.config,
                width_mode: width } }} />
        </section>
      ))}
      <section id="case-containers"><CardRenderer
        card={completeContainerCard} /></section>
      {([
        ["compact", 400],
        ["default", 600],
        ["fill", 900],
      ] as const).map(([width, pixels]) => (
        <section id={`case-markdown-table-${width}`} key={`table-${width}`}
          style={{ width: pixels }}>
          <CardRenderer card={{
            ...completeMarkdownTableCard,
            config: { update_multi: true, width_mode: width },
          }} />
        </section>
      ))}
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
      <OverlayCases />
    </main>
  </React.StrictMode>,
);
