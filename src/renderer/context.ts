import { createContext, useContext } from "react";

export type ResourceResolver<T> = (
  key: string,
  signal: AbortSignal,
) => T | undefined | Promise<T | undefined>;

export type ImageCacheEntry = {
  status: "loading" | "ready" | "error";
  value?: string;
  promise?: Promise<void>;
  listeners: Set<() => void>;
};

type RendererContextValue = Readonly<{
  locale: string;
  colorScheme: "light" | "dark";
  device: "pc" | "mobile";
  widthMode: "default" | "compact" | "fill";
  resolveImage?: ResourceResolver<string>;
  imageCache: Map<string, ImageCacheEntry>;
  controllers: Set<AbortController>;
}>;

export const RendererContext = createContext<RendererContextValue | null>(null);

export function useRendererContext(): RendererContextValue {
  const value = useContext(RendererContext);
  if (!value) throw new Error("RendererContext is missing");
  return value;
}
