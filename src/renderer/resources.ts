import { useEffect, useState } from "react";

import type { Person } from "../types";
import type {
  ImageCacheEntry,
  PersonCacheEntry,
  ResourceCacheEntry,
} from "./context";
import { useRendererContext } from "./context";
import { safeUrl } from "../styles/safe";

function useResource<T>(
  key: string | undefined,
  cache: Map<string, ResourceCacheEntry<T>>,
  resolver: ((key: string, signal: AbortSignal) =>
    T | undefined | Promise<T | undefined>) | undefined,
  sanitize: (value: T | undefined) => T | undefined,
  controllers: Set<AbortController>,
): ResourceCacheEntry<T> | undefined {
  const [, update] = useState(0);
  useEffect(() => {
    if (!key || !resolver) return;
    const listener = () => update((value) => value + 1);
    let entry = cache.get(key);
    if (!entry) {
      entry = { status: "loading", listeners: new Set() };
      cache.set(key, entry);
    }
    entry.listeners.add(listener);
    if (!entry.promise) {
      const controller = new AbortController();
      controllers.add(controller);
      entry.promise = Promise.resolve(resolver(key, controller.signal))
        .then((raw) => {
          if (controller.signal.aborted) return;
          const value = sanitize(raw);
          entry!.status = value === undefined ? "error" : "ready";
          entry!.value = value;
          entry!.listeners.forEach((notify) => notify());
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            entry!.status = "error";
            entry!.listeners.forEach((notify) => notify());
          }
        })
        .finally(() => controllers.delete(controller));
    }
    listener();
    return () => {
      entry?.listeners.delete(listener);
    };
  }, [cache, controllers, key, resolver, sanitize]);
  return key && resolver
    ? cache.get(key) ?? { status: "loading", listeners: new Set() }
    : undefined;
}

const sanitizeImage = (value: string | undefined): string | undefined =>
  safeUrl(value);

function sanitizePerson(value: Person | undefined): Person | undefined {
  if (!value || typeof value !== "object") return undefined;
  const name = typeof value.name === "string" && value.name.trim()
    ? value.name.slice(0, 200) : undefined;
  const avatarUrl = safeUrl(value.avatarUrl);
  if (!name && !avatarUrl) return undefined;
  return { id: "", name, avatarUrl };
}

export function useImageResource(key?: string): ImageCacheEntry | undefined {
  const context = useRendererContext();
  return useResource(
    key,
    context.imageCache,
    context.resolveImage,
    sanitizeImage,
    context.imageControllers,
  );
}

export function usePersonResource(key?: string): PersonCacheEntry | undefined {
  const context = useRendererContext();
  return useResource(
    key,
    context.personCache,
    context.resolvePerson,
    sanitizePerson,
    context.personControllers,
  );
}
