import { cva } from "class-variance-authority";

export const buttonVariants = cva("fcr-ui-button", {
  variants: {
    variant: {
      default: "fcr-ui-button-default",
      outline: "fcr-ui-button-outline",
      ghost: "fcr-ui-button-ghost",
      destructive: "fcr-ui-button-destructive",
    },
    size: {
      default: "fcr-ui-button-size-default",
      sm: "fcr-ui-button-size-sm",
      icon: "fcr-ui-button-size-icon",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});
