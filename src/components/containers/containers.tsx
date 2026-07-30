import { useEffect, useId, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

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
  useRendererContext,
  useRecursiveContext,
} from "../../renderer/context";
import { actionsFor } from "../../interactions/behaviors";
import { useFormScope } from "../../interactions/form-state";
import { ContainerLayout, layoutStyle, safeRadius } from "./layout";
import { keyForElement } from "../../schema/identity";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Button } from "../ui/button";

function childPath(path: string, collection: "columns" | "elements", index: number) {
  return `${path}.${collection}[${index}]`;
}

function Children({ elements, path, collection = "elements" }: {
  elements: readonly Parameters<typeof ComponentRenderer>[0]["element"][];
  path: string;
  collection?: "columns" | "elements";
}): React.JSX.Element {
  const { uniqueElementIds } = useRendererContext();
  return (
    <>
      {elements.map((element, index) => {
        const nextPath = childPath(path, collection, index);
        return (
          <ComponentRenderer key={keyForElement(
            element,
            nextPath,
            uniqueElementIds,
          )}
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
  return (
    <FormScopeBoundary key={`${path}\u0000${element.name}`}
      element={element} path={path} recursive={recursive} />
  );
}

function FormScopeBoundary({ element, path, recursive }: {
  element: FormElement;
  path: string;
  recursive: ReturnType<typeof useRecursiveContext>;
}): React.JSX.Element {
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
  const { onAction } = useRendererContext();
  const actionable = Array.isArray(element.behaviors) &&
    element.behaviors.length > 0;
  const activate = (event: React.SyntheticEvent<HTMLElement>) => {
    event.stopPropagation();
    actionsFor(element, path).forEach((action) => onAction?.(action));
  };
  return (
    <ContainerLayout className={[
      "fcr-interactive-container",
      element.has_border ? "fcr-has-border" : "",
    ].filter(Boolean).join(" ")} element={element}
      data-fcr-path={path} data-fcr-depth={containerDepth}
      role={actionable ? "button" : undefined}
      aria-label={actionable ? "交互容器" : undefined}
      tabIndex={actionable && onAction ? 0 : undefined}
      aria-disabled={actionable && !onAction ? true : undefined}
      style={{ borderRadius: safeRadius(element.corner_radius) }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !onAction ||
          (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        activate(event);
      }}
      onClick={(event) => {
        const target = event.target as Element;
        const childControl = target.closest(
          "button, a, input, select, textarea, [role='button'], [role='link']",
        );
        const nestedContainer = target.closest(".fcr-interactive-container");
        if (event.defaultPrevented ||
          (childControl && childControl !== event.currentTarget &&
            event.currentTarget.contains(childControl)) ||
          (nestedContainer && nestedContainer !== event.currentTarget)) {
          return;
        }
        if (onAction) activate(event);
        else event.stopPropagation();
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
  const instanceId = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const contentId = `fcr-panel-${instanceId}`;
  const title = element.header?.title?.content ?? "折叠面板";
  const iconPositionClass = {
    left: "fcr-icon-left",
    right: "fcr-icon-right",
  }[element.header?.icon_position ?? "left"];
  const header = (
    <CollapsibleTrigger
      render={<Button
        type="button"
        variant="ghost"
        className={[
          "fcr-collapsible-trigger",
          iconPositionClass,
        ].join(" ")}
      />}
      aria-controls={contentId}>
      <ChevronDownIcon
        aria-hidden="true"
        data-icon="inline-start"
        className="fcr-collapse-icon"
      />
      <span>{title}</span>
    </CollapsibleTrigger>
  );
  return (
    <Collapsible
      render={<section />}
      className="fcr-collapsible-panel"
      data-fcr-path={path}
      data-fcr-depth={containerDepth}
      open={expanded}
      onOpenChange={setExpanded}
      style={{ borderRadius: safeRadius(element.border?.corner_radius) }}>
      {(element.header?.position ?? "top") === "top" && header}
      <CollapsibleContent
        id={contentId}
        className="fcr-collapsible-content"
        keepMounted>
        <Children elements={element.elements} path={path} />
      </CollapsibleContent>
      {element.header?.position === "bottom" && header}
    </Collapsible>
  );
}
