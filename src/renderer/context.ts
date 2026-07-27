import { createContext, useContext } from "react";
import type { Person } from "../types";
import type { CardAction } from "../types";
import type { MarkdownAnalysis } from "../markdown/bounded";

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
  domIdPrefix: string;
  locale: string;
  colorScheme: "light" | "dark";
  device: "pc" | "mobile";
  widthMode: "default" | "compact" | "fill";
  resolveImage?: ResourceResolver<string>;
  resolvePerson?: ResourceResolver<Person>;
  imageCache: Map<string, ImageCacheEntry>;
  personCache: Map<string, PersonCacheEntry>;
  imageControllers: Set<AbortController>;
  personControllers: Set<AbortController>;
  uniqueElementIds: ReadonlySet<string>;
  onAction?: (action: CardAction) => void;
  markdownAnalyses: ReadonlyMap<string, MarkdownAnalysis>;
  cardStyle: Readonly<Record<string, unknown>>;
}>;

export const RendererContext = createContext<RendererContextValue | null>(null);

export type FormScope = Readonly<{
  name: string;
  path: string;
  values: Readonly<Record<string, unknown>>;
  registerField: (name: string, fieldType: string, initialValue: unknown,
    isMissing: (value: unknown) => boolean) => () => void;
  updateField: (name: string, fieldType: string, initialValue: unknown,
    required: boolean, isMissing: (value: unknown) => boolean) => void;
  setValue: (name: string, value: unknown) => void;
  setFieldControl: (name: string, control: HTMLElement | null) => void;
  invalidFields: ReadonlySet<string>;
  reset: () => void;
  validateRequired: () => boolean;
}>;

export type RecursiveContextValue = Readonly<{
  path: string;
  containerDepth: number;
  form?: FormScope;
}>;

export const RecursiveContext = createContext<RecursiveContextValue>({
  path: "$.body",
  containerDepth: 0,
});

export function useRendererContext(): RendererContextValue {
  const value = useContext(RendererContext);
  if (!value) throw new Error("RendererContext is missing");
  return value;
}

export function useRecursiveContext(): RecursiveContextValue {
  return useContext(RecursiveContext);
}
