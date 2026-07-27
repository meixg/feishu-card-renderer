import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { UiPortalContext, useUiPortalHost } from "./portal-context";

export function UiPortalProvider({ children }: {
  children: React.ReactNode;
}): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const cleanups = useRef(new Set<() => void>());
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanups.current.add(cleanup);
    return () => cleanups.current.delete(cleanup);
  }, []);
  useEffect(() => () => {
    for (const cleanup of cleanups.current) cleanup();
    cleanups.current.clear();
  }, []);
  const context = useMemo(
    () => ({ hostRef, registerCleanup }),
    [registerCleanup],
  );

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

export function UiPortal({ children }: {
  children: React.ReactNode;
}): React.ReactPortal | null {
  const host = useUiPortalHost();
  if (!host) return null;
  return createPortal(
    <UiPortalEventBoundary>{children}</UiPortalEventBoundary>,
    host,
  );
}
