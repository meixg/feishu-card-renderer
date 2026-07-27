import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

function Field({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="field"
      className={cn("fcr-ui-field", className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn("fcr-ui-field-label", className)}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("fcr-ui-field-description", className)}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("fcr-ui-field-error", className)}
      {...props}
    />
  );
}

export { Field, FieldDescription, FieldError, FieldLabel };
