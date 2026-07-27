import type {
  CardElement,
  TextElement,
  UnsupportedCardElement,
} from "./components";

export type CardConfig = {
  update_multi?: true;
  width_mode?: "default" | "compact" | "fill";
  streaming_mode?: boolean;
  locales?: string[];
  enable_forward?: boolean;
  use_custom_translation?: boolean;
  enable_forward_interaction?: boolean;
  style?: Record<string, unknown>;
  [key: string]: unknown;
};

export type CardHeader = {
  title: TextElement;
  subtitle?: TextElement;
  template?: string;
  [key: string]: unknown;
};

export type CardBody = {
  elements?: CardElement[];
  direction?: "vertical" | "horizontal";
  horizontal_align?: "left" | "center" | "right";
  vertical_align?: "top" | "center" | "bottom";
  padding?: string;
  horizontal_spacing?: string;
  vertical_spacing?: string;
  [key: string]: unknown;
};

export type Card = {
  schema: "2.0";
  config?: CardConfig;
  header?: CardHeader;
  body?: CardBody;
  card_link?: Record<string, unknown>;
  [key: string]: unknown;
};

export type NormalizedCardBody = Omit<CardBody, "elements"> & {
  direction: "vertical" | "horizontal";
  horizontal_align: "left" | "center" | "right";
  vertical_align: "top" | "center" | "bottom";
  elements: Array<CardElement | UnsupportedCardElement>;
};

export type NormalizedCard = Omit<Card, "config" | "body"> & {
  config: CardConfig & {
    update_multi: true;
    width_mode: "default" | "compact" | "fill";
  };
  body: NormalizedCardBody;
};
