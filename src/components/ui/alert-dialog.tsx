import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { UiPortalEventBoundary } from "@/renderer/portal";
import { useUiPortalHost } from "@/renderer/portal-context";
import { Button, type ButtonProps } from "./button";

function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogContent({
  className,
  children,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  const portalHost = useUiPortalHost();
  if (!portalHost) return null;
  return (
    <AlertDialogPrimitive.Portal
      data-slot="alert-dialog-portal"
      container={portalHost}
    >
      <UiPortalEventBoundary>
        <AlertDialogPrimitive.Backdrop
          data-slot="alert-dialog-overlay"
          className="fcr-confirm-backdrop"
        />
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={cn("fcr-confirm-dialog", className)}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Popup>
      </UiPortalEventBoundary>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader(props: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" {...props} />;
}

function AlertDialogFooter(props: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" {...props} />;
}

function AlertDialogTitle(props: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" {...props} />;
}

function AlertDialogDescription(
  props: AlertDialogPrimitive.Description.Props,
) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

function AlertDialogAction(props: ButtonProps) {
  return <Button data-slot="alert-dialog-action" {...props} />;
}

function AlertDialogCancel({
  variant = "outline",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<ButtonProps, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button variant={variant} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
};
