import { useEffect, useState } from "react";

import type {
  CollapsiblePanelElement,
  ColumnElement,
  ColumnSetElement,
  FormElement,
  InteractiveContainerElement,
} from "../../schema/components";
import { safeSpacing } from "../../styles/safe";
import { ComponentRenderer } from "../../renderer/ComponentRenderer";
import {
  RecursiveContext,
  useRecursiveContext,
} from "../../renderer/context";
import { activateInteractiveContainer } from "../../interactions/container";
import { useFormScope } from "../../interactions/form-state";
import { ContainerLayout, layoutStyle, safeRadius } from "./layout";

function keyFor(element: unknown, path: string): string {
  if (typeof element === "object" && element !== null &&
    "element_id" in element && typeof element.element_id === "string") {
    return element.element_id;
  }
  return path;
}

function childPath(path: string, collection: "columns" | "elements", index: number) {
  return `${path}.${collection}[${index}]`;
}

function stablePanelId(path: string): string {
  let hash = 2166136261;
  for (const character of path) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fcr-panel-${(hash >>> 0).toString(36)}`;
}

function Children({ elements, path, collection = "elements" }: {
  elements: readonly Parameters<typeof ComponentRenderer>[0]["element"][];
  path: string;
  collection?: "columns" | "elements";
}): React.JSX.Element {
  return (
    <>
      {elements.map((element, index) => {
        const nextPath = childPath(path, collection, index);
        return (
          <ComponentRenderer key={keyFor(element, nextPath)}
            element={element} path={nextPath} />
        );
      })}
    </>
  );
}

export function ColumnSet({ element, path }: {
  element: ColumnSetElement;
  path: string;
}): React.JSX.Element {
  const { containerDepth } = useRecursiveContext();
  return (
    <div className="fcr-column-set" data-fcr-path={path}
      data-fcr-depth={containerDepth}
      style={{
        gap: safeSpacing(element.horizontal_spacing),
        justifyContent: {
          left: "flex-start",
          center: "center",
          right: "flex-end",
        }[element.horizontal_align ?? "left"],
      }}>
      <Children elements={element.columns} path={path} collection="columns" />
    </div>
  );
}

export function Column({ element, path }: {
  element: ColumnElement;
  path: string;
}): React.JSX.Element {
  const { containerDepth } = useRecursiveContext();
  const flex = element.width === "weighted" &&
      typeof element.weight === "number" && Number.isFinite(element.weight) &&
      element.weight > 0
    ? element.weight
    : undefined;
  return (
    <ContainerLayout className="fcr-column" element={element}
      data-fcr-path={path} data-fcr-depth={containerDepth}
      style={{ flex }}>
      <Children elements={element.elements} path={path} />
    </ContainerLayout>
  );
}

export function Form({ element, path }: {
  element: FormElement;
  path: string;
}): React.JSX.Element {
  const recursive = useRecursiveContext();
  const form = useFormScope(element.name, path);
  return (
    <RecursiveContext.Provider value={{ ...recursive, form }}>
      <form className="fcr-form" data-fcr-path={path}
        data-fcr-depth={recursive.containerDepth}
        style={layoutStyle(element)}
        onSubmit={(event) => event.preventDefault()}>
        <Children elements={element.elements} path={path} />
      </form>
    </RecursiveContext.Provider>
  );
}

export function InteractiveContainer({ element, path }: {
  element: InteractiveContainerElement;
  path: string;
}): React.JSX.Element {
  const { containerDepth } = useRecursiveContext();
  const behaviors = Array.isArray(element.behaviors) ? element.behaviors : [];
  return (
    <ContainerLayout className={[
      "fcr-interactive-container",
      element.has_border ? "fcr-has-border" : "",
    ].filter(Boolean).join(" ")} element={element}
      data-fcr-path={path} data-fcr-depth={containerDepth}
      style={{ borderRadius: safeRadius(element.corner_radius) }}
      onClickCapture={(event) => {
        const closest = (event.target as Element).closest(
          ".fcr-interactive-container",
        );
        if (closest !== event.currentTarget) return;
        activateInteractiveContainer(event, {
          tag: "interactive_container",
          path,
          elementId: element.element_id,
          behaviors,
        });
      }}>
      <Children elements={element.elements} path={path} />
    </ContainerLayout>
  );
}

export function CollapsiblePanel({ element, path }: {
  element: CollapsiblePanelElement;
  path: string;
}): React.JSX.Element {
  const { containerDepth } = useRecursiveContext();
  const [expanded, setExpanded] = useState(element.expanded ?? false);
  useEffect(() => {
    setExpanded(element.expanded ?? false);
  }, [element.expanded]);
  const contentId = stablePanelId(path);
  const title = element.header?.title?.content ?? "折叠面板";
  const header = (
    <button type="button" className={[
      "fcr-collapsible-trigger",
      `fcr-icon-${element.header?.icon_position ?? "left"}`,
    ].join(" ")}
      aria-expanded={expanded} aria-controls={contentId}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setExpanded((value) => !value);
      }}>
      <span aria-hidden="true" className="fcr-collapse-icon">⌄</span>
      <span>{title}</span>
    </button>
  );
  return (
    <section className="fcr-collapsible-panel" data-fcr-path={path}
      data-fcr-depth={containerDepth}
      style={{ borderRadius: safeRadius(element.border?.corner_radius) }}>
      {(element.header?.position ?? "top") === "top" && header}
      <div id={contentId} className="fcr-collapsible-content"
        hidden={!expanded}>
        <Children elements={element.elements} path={path} />
      </div>
      {element.header?.position === "bottom" && header}
    </section>
  );
}
