import { useEffect, useState } from "react";

import type {
  DivElement,
  HrElement,
  ImageElement,
  MarkdownElement,
} from "../../schema/components";
import {
  useRendererContext,
} from "../../renderer/context";
import { safeBox, safePx, safeUrl } from "../../styles/safe";
import { SafeMarkdown, SafeText } from "../primitives/SafeText";

export function Div({ element }: { element: DivElement }): React.JSX.Element {
  return (
    <div className="fcr-div" style={{ margin: safeBox(element.margin, true) }}>
      {element.text && <SafeText text={element.text} />}
    </div>
  );
}

export function Markdown({ element }: { element: MarkdownElement }): React.JSX.Element {
  return (
    <div className="fcr-markdown">
      <SafeMarkdown content={element.content ?? ""} />
    </div>
  );
}

export function Hr({ element }: { element: HrElement }): React.JSX.Element {
  return <hr className="fcr-hr"
    style={{ margin: safeBox(element.margin, true) }} />;
}

export function Image({ element }: { element: ImageElement }): React.JSX.Element {
  const context = useRendererContext();
  const [, update] = useState(0);
  const key = element.img_key;
  useEffect(() => {
    if (!key || !context.resolveImage) return;
    const listener = () => update((value) => value + 1);
    let cacheEntry = context.imageCache.get(key);
    if (!cacheEntry) {
      cacheEntry = { status: "loading", listeners: new Set() };
      context.imageCache.set(key, cacheEntry);
    }
    cacheEntry.listeners.add(listener);
    if (!cacheEntry.promise) {
      const controller = new AbortController();
      context.controllers.add(controller);
      cacheEntry.promise = Promise.resolve(context.resolveImage(key, controller.signal))
        .then((value) => {
          if (controller.signal.aborted) return;
          const safeValue = safeUrl(value);
          cacheEntry!.status = safeValue ? "ready" : "error";
          cacheEntry!.value = safeValue;
          cacheEntry!.listeners.forEach((notify) => notify());
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            cacheEntry!.status = "error";
            cacheEntry!.listeners.forEach((notify) => notify());
          }
        })
        .finally(() => context.controllers.delete(controller));
    }
    listener();
    return () => {
      cacheEntry?.listeners.delete(listener);
    };
  }, [context, key]);
  const current = key ? context.imageCache.get(key) : undefined;
  const alt = element.alt?.content ?? "";
  const title = element.title?.content;
  if (current?.status === "ready" && current.value) {
    return <figure className="fcr-image" style={{
      margin: safeBox(element.margin, true),
      borderRadius: safePx(element.corner_radius),
    }}>
      <img src={current.value} alt={alt} title={title} />
      {title && <figcaption>{title}</figcaption>}
    </figure>;
  }
  return (
    <div className="fcr-image-placeholder" role="img"
      aria-label={alt || "图片不可用"}
      data-state={current?.status ?? (context.resolveImage ? "loading" : "unavailable")}>
      {alt || "图片不可用"}
    </div>
  );
}
