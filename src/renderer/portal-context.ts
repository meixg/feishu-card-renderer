import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export type UiPortalContextValue = Readonly<{
  hostRef: RefObject<HTMLDivElement | null>;
  registerCleanup: (cleanup: () => void) => () => void;
}>;

export const UiPortalContext = createContext<UiPortalContextValue | null>(null);

function useUiPortalContext(): UiPortalContextValue {
  const context = useContext(UiPortalContext);
  if (!context) throw new Error("UiPortalContext is missing");
  return context;
}

export function useUiPortalHostRef(): RefObject<HTMLDivElement | null> {
  return useUiPortalContext().hostRef;
}

export function useUiPortalHost(): HTMLElement | null {
  const hostRef = useUiPortalHostRef();
  const [host, setHost] = useState<HTMLElement | null>(() => hostRef.current);
  useEffect(() => {
    setHost(hostRef.current);
  }, [hostRef]);
  return host;
}

export function useUiPortalCleanup(cleanup: () => void): void {
  const { registerCleanup } = useUiPortalContext();
  const latestCleanup = useRef(cleanup);
  latestCleanup.current = cleanup;
  useEffect(() => {
    let active = true;
    const run = () => {
      if (!active) return;
      active = false;
      latestCleanup.current();
    };
    const unregister = registerCleanup(run);
    return () => {
      unregister();
      run();
    };
  }, [registerCleanup]);
}
