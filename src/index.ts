export { CardRenderer } from "./renderer/CardRenderer";
export type { CardRendererProps } from "./renderer/CardRenderer";
export type {
  ActionSource,
  CardAction,
  FatalFallback,
  Person,
  ResourceResolver,
} from "./types";
export {
  AUXILIARY_TAGS,
  CARD_COMPONENT_TAGS,
  CARD_COMPONENT_SCHEMAS,
  isCardElement,
  isCardComponentTag,
} from "./schema/components";
export type {
  CardComponentTag,
  CardElement,
  RuntimeTagSchema,
  UnsupportedCardElement,
} from "./schema/components";
export type {
  Card,
  Card as CardJsonV2,
  CardBody,
  CardConfig,
  CardHeader,
  NormalizedCard,
} from "./schema/card";
export type {
  CardDiagnostic,
  CardDiagnosticCode,
  DiagnosticClassification,
  DiagnosticSeverity,
  ProtocolPath,
  ValidationResult,
} from "./schema/diagnostics";
export { childPath } from "./schema/diagnostics";
export { normalizeCard } from "./schema/normalize";
export { validateCard } from "./schema/validate";

import "./styles.css";
