import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { UiPortalEventBoundary } from "@/renderer/portal";
import { useUiPortalHost } from "@/renderer/portal-context";
import { Button } from "./button";

function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "关闭",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  closeLabel?: string;
}) {
  const portalHost = useUiPortalHost();
  if (!portalHost) return null;
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal" container={portalHost}>
      <UiPortalEventBoundary>
        <DialogPrimitive.Backdrop
          data-slot="dialog-overlay"
          className="fcr-preview-backdrop"
        />
        <div data-slot="dialog-positioner" className="fcr-preview-positioner">
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className={cn("fcr-preview-dialog", className)}
            {...props}
          >
            {children}
            {showCloseButton && (
              <DialogPrimitive.Close
                data-slot="dialog-close"
                render={<Button variant="ghost" size="icon-sm"
                  className="fcr-ui-dialog-close" />}
                aria-label={closeLabel}
              >
                <XIcon aria-hidden="true" />
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Popup>
        </div>
      </UiPortalEventBoundary>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader(props: ComponentProps<"div">) {
  return <div data-slot="dialog-header" {...props} />;
}

function DialogTitle(props: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}

function DialogDescription(props: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description data-slot="dialog-description" {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
