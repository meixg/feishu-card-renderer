import { createContext, useContext } from "react";
import type { Person } from "../types";

export type ResourceResolver<T> = (
  key: string,
  signal: AbortSignal,
) => T | undefined | Promise<T | undefined>;

export type ResourceCacheEntry<T> = {
  status: "loading" | "ready" | "error";
  value?: T;
  promise?: Promise<void>;
  listeners: Set<() => void>;
};
export type ImageCacheEntry = ResourceCacheEntry<string>;
export type PersonCacheEntry = ResourceCacheEntry<Person>;

type RendererContextValue = Readonly<{
  locale: string;
  colorScheme: "light" | "dark";
  device: "pc" | "mobile";
  widthMode: "default" | "compact" | "fill";
  resolveImage?: ResourceResolver<string>;
  resolvePerson?: ResourceResolver<Person>;
  imageCache: Map<string, ImageCacheEntry>;
  personCache: Map<string, PersonCacheEntry>;
  controllers: Set<AbortController>;
}>;

export const RendererContext = createContext<RendererContextValue | null>(null);

export function useRendererContext(): RendererContextValue {
  const value = useContext(RendererContext);
  if (!value) throw new Error("RendererContext is missing");
  return value;
}
