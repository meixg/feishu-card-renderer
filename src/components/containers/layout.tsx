import type {
  CSSProperties,
  HTMLAttributes,
  PropsWithChildren,
} from "react";

import { safeBox, safePx, safeSpacing } from "../../styles/safe";

type LayoutElement = {
  direction?: "vertical" | "horizontal";
  horizontal_spacing?: string;
  vertical_spacing?: string;
  horizontal_align?: "left" | "center" | "right";
  vertical_align?: "top" | "center" | "bottom";
  padding?: string;
};

const horizontalAlign = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

const verticalAlign = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
} as const;

// eslint-disable-next-line react-refresh/only-export-components
export function layoutStyle(element: LayoutElement): CSSProperties {
  const direction = element.direction ?? "vertical";
  return {
    flexDirection: direction === "horizontal" ? "row" : "column",
    gap: safeSpacing(direction === "horizontal"
      ? element.horizontal_spacing
      : element.vertical_spacing),
    alignItems: direction === "horizontal"
      ? verticalAlign[element.vertical_align ?? "top"]
      : horizontalAlign[element.horizontal_align ?? "left"],
    justifyContent: direction === "horizontal"
      ? horizontalAlign[element.horizontal_align ?? "left"]
      : verticalAlign[element.vertical_align ?? "top"],
    padding: safeBox(element.padding, false),
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function safeRadius(value: unknown): string | undefined {
  return safePx(value);
}

export function ContainerLayout({
  className,
  element,
  children,
  ...props
}: PropsWithChildren<{
  className: string;
  element: LayoutElement;
  "data-fcr-path": string;
  "data-fcr-depth": number;
} & HTMLAttributes<HTMLDivElement>>): React.JSX.Element {
  return (
    <div {...props} className={className}
      style={{ ...layoutStyle(element), ...props.style }}>
      {children}
    </div>
  );
}
