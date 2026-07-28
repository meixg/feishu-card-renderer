import {
  createContext,
  useContext,
  useEffect,
  useState,
  type RefObject,
} from "react";

export type UiPortalContextValue = Readonly<{
  hostRef: RefObject<HTMLDivElement | null>;
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
