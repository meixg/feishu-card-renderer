import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const Checkbox = forwardRef<
  HTMLElement,
  Omit<CheckboxPrimitive.Root.Props, "ref">
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      className={cn("fcr-ui-checkbox", className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        aria-hidden="true"
        data-slot="checkbox-indicator"
        className="fcr-ui-checkbox-indicator"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

export { Checkbox };
