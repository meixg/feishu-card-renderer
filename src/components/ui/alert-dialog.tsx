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
          className="fcr-ui-alert-dialog-overlay"
        />
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={cn("fcr-ui-alert-dialog-content", className)}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Popup>
      </UiPortalEventBoundary>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("fcr-ui-alert-dialog-header", className)}
    data-slot="alert-dialog-header" {...props} />;
}

function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("fcr-ui-alert-dialog-footer", className)}
    data-slot="alert-dialog-footer" {...props} />;
}

function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title
    className={cn("fcr-ui-alert-dialog-title", className)}
    data-slot="alert-dialog-title" {...props} />;
}

function AlertDialogDescription(
  { className, ...props }: AlertDialogPrimitive.Description.Props,
) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("fcr-ui-alert-dialog-description", className)}
      {...props}
    />
  );
}

function AlertDialogAction({ className, ...props }: ButtonProps) {
  return <Button className={cn("fcr-ui-alert-dialog-action", className)}
    data-slot="alert-dialog-action" {...props} />;
}

function AlertDialogCancel({
  variant = "outline",
  className,
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<ButtonProps, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn("fcr-ui-alert-dialog-cancel", className)}
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
