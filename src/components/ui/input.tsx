import { Input as InputPrimitive } from "@base-ui/react/input";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const Input = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<typeof InputPrimitive>, "ref">
>(function Input({ className, type, ...props }, ref) {
  return (
    <InputPrimitive
      ref={ref}
      type={type}
      data-slot="input"
      className={cn("fcr-ui-input", className)}
      {...props}
    />
  );
});

export { Input };
