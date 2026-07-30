import type { ButtonProps } from "../ui/button";
import type { ButtonElement } from "../../schema/components";

export type ButtonProtocolType = NonNullable<ButtonElement["type"]>;
export type ButtonVariant = NonNullable<ButtonProps["variant"]>;

/**
 * Functional renderer mapping, not a claim of visual equivalence with Feishu.
 * Bordered/filled protocol distinctions intentionally share the closest shadcn
 * semantic where shadcn has no corresponding visual axis.
 */
export const BUTTON_VARIANT_BY_TYPE = {
  default: "outline",
  primary: "default",
  danger: "destructive",
  text: "ghost",
  primary_text: "link",
  danger_text: "destructiveGhost",
  primary_filled: "default",
  danger_filled: "destructive",
  laser: "outline",
} as const satisfies Record<ButtonProtocolType, ButtonVariant>;
