import type { CardDiagnostic } from "./schema/diagnostics";
import type { ResourceResolver } from "./renderer/context";

export type Person = {
  id: string;
  name?: string;
  avatarUrl?: string;
};

export type ActionSource = {
  tag: string;
  elementId?: string;
  name?: string;
  path: string;
};

export type CardAction =
  | { type: "callback"; source: ActionSource; value?: unknown;
      formValue?: Record<string, unknown>; timezone?: string }
  | { type: "open_url"; source: ActionSource; url: string };

export type FatalFallback = (
  diagnostics: readonly CardDiagnostic[],
) => React.ReactNode;

export type { ResourceResolver };
