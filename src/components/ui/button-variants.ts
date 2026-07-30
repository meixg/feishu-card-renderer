import { cva } from "class-variance-authority";

export const buttonVariants = cva("fcr-ui-button", {
  variants: {
    variant: {
      default: "fcr-ui-button-default",
      outline: "fcr-ui-button-outline",
      secondary: "fcr-ui-button-secondary",
      ghost: "fcr-ui-button-ghost",
      destructive: "fcr-ui-button-destructive",
      destructiveGhost: "fcr-ui-button-destructive-ghost",
      link: "fcr-ui-button-link",
    },
    size: {
      default: "fcr-ui-button-size-default",
      xs: "fcr-ui-button-size-xs",
      sm: "fcr-ui-button-size-sm",
      lg: "fcr-ui-button-size-lg",
      icon: "fcr-ui-button-size-icon",
      "icon-xs": "fcr-ui-button-size-icon-xs",
      "icon-sm": "fcr-ui-button-size-icon-sm",
      "icon-lg": "fcr-ui-button-size-icon-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});
