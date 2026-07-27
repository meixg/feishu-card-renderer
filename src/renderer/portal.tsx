import {
  type ComponentProps,
  useMemo,
  useRef,
} from "react";
import { UiPortalContext } from "./portal-context";

export function UiPortalProvider({ children }: {
  children: React.ReactNode;
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const context = useMemo(() => ({ hostRef }), []);

  return (
    <UiPortalContext.Provider value={context}>
      {children}
      <div ref={hostRef} className="fcr-portal-host"
        data-fcr-portal-host="" />
    </UiPortalContext.Provider>
  );
}

export function UiPortalEventBoundary({
  onClick,
  onKeyDown,
  onPointerDown,
  ...props
}: ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-fcr-portal-boundary=""
      {...props}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        onKeyDown?.(event);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown?.(event);
      }}
    />
  );
}
