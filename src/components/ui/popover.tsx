import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";
import { UiPortalEventBoundary } from "@/renderer/portal";
import { useUiPortalHost } from "@/renderer/portal-context";

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  align = "start",
  alignOffset = 0,
  className,
  side = "bottom",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props & Pick<
  PopoverPrimitive.Positioner.Props,
  "align" | "alignOffset" | "side" | "sideOffset"
>) {
  const portalHost = useUiPortalHost();
  if (!portalHost) return null;
  return (
    <PopoverPrimitive.Portal container={portalHost}>
      <UiPortalEventBoundary>
        <PopoverPrimitive.Positioner
          align={align}
          alignOffset={alignOffset}
          className="fcr-ui-popover-positioner"
          collisionPadding={8}
          side={side}
          sideOffset={sideOffset}
        >
          <PopoverPrimitive.Popup
            data-slot="popover-content"
            className={cn("fcr-ui-popover-content", className)}
            {...props}
          />
        </PopoverPrimitive.Positioner>
      </UiPortalEventBoundary>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
