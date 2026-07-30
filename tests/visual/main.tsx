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
  formControlsValidationCard,
  singleSelectImageCard,
  standaloneDateControlsCard,
} from "../../src/fixtures/form-controls-card";
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

const choiceVisualCard = {
  schema: "2.0" as const,
  config: { update_multi: true, width_mode: "compact" as const },
  body: {
    elements: [{
      tag: "form",
      name: "choice-visuals",
      elements: [
        {
          tag: "select_static",
          name: "small",
          label: { tag: "plain_text", content: "Small Select" },
          initial_option: "two",
          options: ["one", "two", "three"].map((value) => ({
            text: { tag: "plain_text", content: `Option ${value}` },
            value,
          })),
        },
        {
          tag: "select_static",
          name: "large",
          label: { tag: "plain_text", content: "Searchable Combobox" },
          options: Array.from({ length: 12 }, (_, index) => ({
            text: { tag: "plain_text", content: `Search option ${index + 1}` },
            value: { index },
          })),
        },
        {
          tag: "multi_select_static",
          name: "multi",
          label: { tag: "plain_text", content: "Multiple choices" },
          selected_values: ["one", "two", "three", "four", "five"],
          options: ["one", "two", "three", "four", "five", "six"].map((value) => ({
            text: { tag: "plain_text", content: `Long ${value} choice` },
            value,
          })),
        },
        {
          tag: "select_person",
          name: "person",
          label: { tag: "plain_text", content: "Person" },
          options: [{ value: "ou_ada" }, { value: "ou_grace" }],
        },
        {
          tag: "button",
          form_action_type: "submit",
          text: { tag: "plain_text", content: "Submit choices" },
        },
      ],
    }],
  },
};

const selectImageResourceCard = {
  schema: "2.0" as const,
  body: {
    elements: [{
      tag: "select_img",
      name: "resource-image",
      label: { tag: "plain_text" as const, content: "Resource image" },
      selected_values: ["one"],
      options: [
        {
          text: { tag: "plain_text" as const, content: "Resource one" },
          value: "one",
          img_key: "resource-one",
        },
        {
          text: { tag: "plain_text" as const, content: "Resource two" },
          value: "two",
          img_key: "resource-two",
        },
      ],
    }],
  },
};
const selectImageResourceUrl = new URL(
  "/tests/visual/assets/select-image-resource.svg",
  window.location.origin,
).href;

function SelectImageResourceCase({
  id,
  resolveImage,
}: {
  id: string;
  resolveImage: React.ComponentProps<typeof CardRenderer>["resolveImage"];
}): React.JSX.Element {
  const [actions, setActions] = useState<unknown[]>([]);
  return (
    <section id={id}>
      <CardRenderer
        card={selectImageResourceCard}
        onAction={(action) => setActions((current) => [...current, action])}
        resolveImage={resolveImage}
      />
      <output hidden data-select-image-actions="">
        {JSON.stringify(actions)}
      </output>
    </section>
  );
}

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

const portalLifecycleCard = (owner: "first" | "second", title: string) => ({
  schema: "2.0" as const,
  body: {
    elements: [{
      tag: "interactive_container" as const,
      behaviors: [{
        type: "callback" as const,
        value: { owner: `${owner}-parent` },
      }],
      elements: [{
        tag: "button" as const,
        text: { tag: "plain_text" as const, content: `打开${title}` },
        confirm: {
          title: { tag: "plain_text" as const, content: title },
          text: { tag: "plain_text" as const, content: `${title}内容` },
        },
        behaviors: [{
          type: "callback" as const,
          value: { owner },
        }],
      }],
    }],
  },
});

export function PortalLifecycleCases(): React.JSX.Element {
  const [showFirst, setShowFirst] = useState(true);
  const [showSecond, setShowSecond] = useState(true);
  const [actions, setActions] = useState<unknown[]>([]);
  return (
    <section id="case-portal-lifecycle">
      <button id="remove-first-card" type="button"
        onClick={() => setShowFirst(false)}>
        卸载第一张卡
      </button>
      <button id="remove-second-card" type="button"
        onClick={() => setShowSecond(false)}>
        卸载第二张卡
      </button>
      {showFirst && (
        <div data-portal-card="first">
          <CardRenderer
            card={portalLifecycleCard("first", "第一张卡确认")}
            colorScheme="dark"
            onAction={(action) => setActions((current) => [...current, action])}
          />
        </div>
      )}
      {showSecond && (
        <div data-portal-card="second">
          <CardRenderer
            card={portalLifecycleCard("second", "第二张卡确认")}
            colorScheme="light"
            onAction={(action) => setActions((current) => [...current, action])}
          />
        </div>
      )}
      <output hidden data-portal-actions="">{JSON.stringify(actions)}</output>
    </section>
  );
}

const buttonBaselineCard = (label: string) => ({
  schema: "2.0" as const,
  body: {
    elements: [
      {
        tag: "button" as const,
        type: "primary" as const,
        size: "medium" as const,
        text: { tag: "plain_text" as const, content: label },
        confirm: {
          title: { tag: "plain_text" as const, content: `${label}确认` },
          text: { tag: "plain_text" as const, content: "主题继承检查" },
        },
        behaviors: [{ type: "callback" as const }],
      },
      {
        tag: "button" as const,
        type: "danger" as const,
        size: "small" as const,
        text: { tag: "plain_text" as const, content: `${label}危险` },
        behaviors: [{ type: "callback" as const }],
      },
      {
        tag: "button" as const,
        type: "laser" as const,
        size: "large" as const,
        text: { tag: "plain_text" as const, content: `${label}镭射降级` },
        behaviors: [{ type: "callback" as const }],
      },
      {
        tag: "button" as const,
        type: "default" as const,
        width: "fill" as const,
        text: { tag: "plain_text" as const, content: `${label}描边` },
        behaviors: [{ type: "callback" as const }],
      },
    ],
  },
});

function ButtonBaselineCases(): React.JSX.Element {
  return (
    <section id="case-button-baseline">
      <style>{`
        .fcr-root.fcr-host-button-theme {
          --fcr-interaction-primary: oklch(0.6 0.2 250);
          --fcr-interaction-primary-foreground: oklch(0.98 0 0);
          --fcr-interaction-background: oklch(0.96 0.02 250);
          --fcr-interaction-focus: oklch(0.65 0.03 250);
        }
      `}</style>
      <div data-button-theme="light">
        <CardRenderer card={buttonBaselineCard("浅色")} onAction={() => {}} />
      </div>
      <div data-button-theme="dark">
        <CardRenderer card={buttonBaselineCard("深色")} colorScheme="dark"
          onAction={() => {}} />
      </div>
      <div data-button-theme="host">
        <CardRenderer card={buttonBaselineCard("宿主")} onAction={() => {}}
          className="fcr-host-button-theme" />
      </div>
    </section>
  );
}

export function FormControlCases({
  colorScheme = "light",
  device = "pc",
  id,
  widthMode,
}: {
  colorScheme?: "light" | "dark";
  device?: "pc" | "mobile";
  id: string;
  widthMode: "compact" | "default" | "fill";
}): React.JSX.Element {
  const [actions, setActions] = useState<unknown[]>([]);
  return (
    <section id={id}>
      <CardRenderer
        card={{
          ...formControlsValidationCard,
          config: { update_multi: true, width_mode: widthMode },
        }}
        colorScheme={colorScheme}
        device={device}
        onAction={(action) => setActions((current) => [...current, action])}
        resolveImage={() => undefined}
      />
      <CardRenderer
        card={standaloneDateControlsCard}
        colorScheme={colorScheme}
        device={device}
        onAction={(action) => setActions((current) => [...current, action])}
      />
      <CardRenderer
        card={singleSelectImageCard}
        colorScheme={colorScheme}
        device={device}
        onAction={(action) => setActions((current) => [...current, action])}
        resolveImage={() => undefined}
      />
      <output hidden data-form-control-actions="">{JSON.stringify(actions)}</output>
    </section>
  );
}

const isolatedVisualCase = new URLSearchParams(window.location.search).get("case");

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isolatedVisualCase === "choice"
      ? <main>
          <section id="case-choices-pc" style={{ width: 400 }}>
            <CardRenderer
              card={choiceVisualCard}
              onAction={() => {}}
              resolvePerson={(id) => ({
                id,
                name: id === "ou_ada" ? "Ada Lovelace" : "Grace Hopper",
              })}
            />
          </section>
        </main>
      : isolatedVisualCase === "date"
        ? <main>
            <FormControlCases
              id="case-form-controls-pc"
              widthMode="compact"
            />
          </main>
        : <main style={{ display: "grid", gap: 24 }}>
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
      <PortalLifecycleCases />
      <ButtonBaselineCases />
      <section id="case-choices-pc" style={{ width: 400 }}>
        <CardRenderer
          card={choiceVisualCard}
          onAction={() => {}}
          resolvePerson={(id) => ({
            id,
            name: id === "ou_ada" ? "Ada Lovelace" : "Grace Hopper",
          })}
        />
      </section>
      <section id="case-choices-mobile" style={{ width: 390 }}>
        <CardRenderer
          card={choiceVisualCard}
          device="mobile"
          onAction={() => {}}
          resolvePerson={(id) => ({
            id,
            name: id === "ou_ada" ? "Ada Lovelace" : "Grace Hopper",
          })}
        />
      </section>
      <SelectImageResourceCase
        id="case-select-image-ready"
        resolveImage={() => selectImageResourceUrl}
      />
      <SelectImageResourceCase
        id="case-select-image-missing"
        resolveImage={() => undefined}
      />
      <SelectImageResourceCase
        id="case-select-image-error"
        resolveImage={() => Promise.reject(new Error("resolver rejected"))}
      />
      <FormControlCases
        id="case-form-controls-pc"
        widthMode="compact"
      />
      <FormControlCases
        colorScheme="dark"
        id="case-form-controls-dark"
        widthMode="default"
      />
      <div style={{ width: 390 }}>
        <FormControlCases
          device="mobile"
          id="case-form-controls-mobile"
          widthMode="fill"
        />
      </div>
    </main>}
  </React.StrictMode>,
);
