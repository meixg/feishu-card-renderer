import { useEffect, useMemo, useRef } from "react";

import type { CardDiagnostic } from "../schema/diagnostics";
import type { CardAction, Person } from "../types";
import { normalizeCard } from "../schema/normalize";
import { ComponentRenderer } from "./ComponentRenderer";
import {
  RendererContext,
  type ResourceResolver,
} from "./context";
import { Header } from "../components/content/Header";
import type { CardHeader } from "../schema/card";
import { safeBox, safeSpacing } from "../styles/safe";
import {
  collectUniqueElementIds,
  keyForElement,
} from "../schema/identity";
import { ownDataValue, safeDataSnapshot } from "../schema/safe-data";

export type { ResourceResolver } from "./context";
export type FatalFallback = (
  diagnostics: readonly CardDiagnostic[],
) => React.ReactNode;

export type CardRendererProps = {
  card: unknown;
  locale?: string;
  colorScheme?: "light" | "dark";
  device?: "pc" | "mobile";
  className?: string;
  resolveImage?: ResourceResolver<string>;
  resolvePerson?: ResourceResolver<Person>;
  onAction?: (action: CardAction) => void;
  onDiagnostic?: (diagnostics: readonly CardDiagnostic[]) => void;
  fallback?: React.ReactNode | FatalFallback;
};

function keyFor(diagnostic: CardDiagnostic): string {
  return `${diagnostic.code}:${diagnostic.path}:${diagnostic.message}`;
}

function hasBusinessAction(value: unknown): boolean {
  const pending = [value];
  const seen = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current !== "object" || current === null || seen.has(current)) continue;
    seen.add(current);
    const behaviors = ownDataValue(current, "behaviors");
    const tag = ownDataValue(current, "tag");
    if (Array.isArray(behaviors) && behaviors.length > 0) return true;
    if (tag === "button" && ownDataValue(current, "form_action_type") === "submit") {
      return true;
    }
    if (["input", "select_static", "select_person", "date_picker",
      "picker_time", "picker_datetime", "select_img"].includes(String(tag))) {
      return true;
    }
    const options = ownDataValue(current, "options");
    if (tag === "overflow" && Array.isArray(options) && options.length > 0) return true;
    const descriptors = Object.getOwnPropertyDescriptors(current);
    for (const key of Object.keys(descriptors)) {
      const descriptor = descriptors[key];
      if (!descriptor) continue;
      if ("value" in descriptor) pending.push(descriptor.value);
    }
  }
  return false;
}

export function CardRenderer(props: CardRendererProps): React.JSX.Element {
  const { onDiagnostic } = props;
  const safeCard = useMemo(() => safeDataSnapshot(props.card), [props.card]);
  const result = useMemo(() => normalizeCard(safeCard), [safeCard]);
  const uniqueElementIds = useMemo(
    () => collectUniqueElementIds(safeCard),
    [safeCard],
  );
  const controllers = useRef(new Set<AbortController>());
  const imageCache = useRef(new Map());
  const personCache = useRef(new Map());
  const diagnostics = useMemo(() => {
    const unique = new Map(result.diagnostics.map((item) => [keyFor(item), item]));
    if (!props.onAction && hasBusinessAction(safeCard)) {
      const item: CardDiagnostic = {
        code: "missing_on_action", path: "$", classification: "recoverable",
        severity: "warning",
        message: "Business actions are disabled because onAction is not configured.",
      };
      unique.set(keyFor(item), item);
    }
    return [...unique.values()];
  }, [props.onAction, result.diagnostics, safeCard]);
  const diagnosticKey = diagnostics.map(keyFor).join("|");
  useEffect(() => {
    onDiagnostic?.(diagnostics);
  }, [diagnosticKey, diagnostics, onDiagnostic]);
  useEffect(() => () => {
    controllers.current.forEach((controller) => controller.abort());
    controllers.current.clear();
  }, []);

  if (result.fatal || !result.card) {
    const fallback = typeof props.fallback === "function"
      ? props.fallback(diagnostics)
      : props.fallback;
    return (
      <div className={["fcr-root", props.className].filter(Boolean).join(" ")}
        data-fcr-card-renderer="fatal" role="alert">
        {fallback ?? "无法显示此卡片"}
      </div>
    );
  }

  const card = result.card;
  const header = card.header as CardHeader | undefined;
  const width = card.config.width_mode;
  const context = {
    locale: props.locale ?? "zh_cn",
    colorScheme: props.colorScheme ?? "light",
    device: props.device ?? "pc",
    widthMode: width,
    resolveImage: props.resolveImage,
    resolvePerson: props.resolvePerson,
    imageCache: imageCache.current,
    personCache: personCache.current,
    controllers: controllers.current,
    uniqueElementIds,
    onAction: props.onAction,
  } as const;
  const bodyStyle = {
    padding: safeBox(card.body.padding, false),
    gap: safeSpacing(card.body.direction === "horizontal"
      ? card.body.horizontal_spacing
      : card.body.vertical_spacing),
  };
  return (
    <RendererContext.Provider value={context}>
      <article
        className={[
          "fcr-root",
          `fcr-width-${width}`,
          `fcr-theme-${context.colorScheme}`,
          `fcr-device-${context.device}`,
          props.className,
        ].filter(Boolean).join(" ")}
        data-fcr-card-renderer="ready"
        data-locale={context.locale}
      >
        {header && <Header header={header} />}
        <div className={`fcr-body fcr-direction-${card.body.direction}`}
          style={bodyStyle}>
          {card.body.elements.map((element, index) => (
            <ComponentRenderer key={keyForElement(
              element,
              `$.body.elements[${index}]`,
              uniqueElementIds,
            )} element={element} path={`$.body.elements[${index}]`} />
          ))}
        </div>
      </article>
    </RendererContext.Provider>
  );
}
