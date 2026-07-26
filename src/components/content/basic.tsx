import { useEffect, useState } from "react";

import type {
  DivElement,
  HrElement,
  ImageElement,
  MarkdownElement,
} from "../../schema/components";
import {
  type ImageCacheEntry,
  useRendererContext,
} from "../../renderer/context";
import { safeBox, safePx } from "../../styles/safe";
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
  const entry = key ? context.imageCache.get(key) : undefined;
  useEffect(() => {
    if (!key || !context.resolveImage || context.imageCache.has(key)) return;
    const controller = new AbortController();
    context.controllers.add(controller);
    const cacheEntry: ImageCacheEntry = { status: "loading" };
    context.imageCache.set(key, cacheEntry);
    cacheEntry.promise = Promise.resolve(context.resolveImage(key, controller.signal))
      .then((value) => {
        if (controller.signal.aborted) return;
        context.imageCache.set(key, value
          ? { status: "ready", value }
          : { status: "error" });
        update((value) => value + 1);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          context.imageCache.set(key, { status: "error" });
          update((value) => value + 1);
        }
      })
      .finally(() => context.controllers.delete(controller));
    update((value) => value + 1);
  }, [context, entry, key]);
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
