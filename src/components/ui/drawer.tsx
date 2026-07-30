import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import {
  createContext,
  useContext,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";
import { UiPortalEventBoundary } from "@/renderer/portal";
import { useUiPortalHost } from "@/renderer/portal-context";

type DrawerContextValue = Readonly<{
  modal: DrawerPrimitive.Root.Props["modal"];
  showSwipeHandle: boolean;
  swipeDirection: NonNullable<DrawerPrimitive.Root.Props["swipeDirection"]>;
}>;

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) throw new Error("Drawer parts must be used within Drawer.");
  return context;
}

function Drawer({
  modal = true,
  showSwipeHandle = false,
  swipeDirection = "down",
  ...props
}: DrawerPrimitive.Root.Props & { showSwipeHandle?: boolean }) {
  const context = useMemo(
    () => ({ modal, showSwipeHandle, swipeDirection }),
    [modal, showSwipeHandle, swipeDirection],
  );
  return (
    <DrawerContext.Provider value={context}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        modal={modal}
        swipeDirection={swipeDirection}
        {...props}
      />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger(props: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn("fcr-ui-drawer-overlay", className)}
      {...props}
    />
  );
}

function DrawerSwipeHandle({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="drawer-swipe-handle"
      className={cn("fcr-ui-drawer-swipe-handle", className)}
      {...props}
    />
  );
}

type DrawerContentProps = DrawerPrimitive.Popup.Props & Readonly<{
  children?: ReactNode;
  container?: HTMLElement | ShadowRoot | null;
  keyboardAware?: boolean;
}>;

function DrawerContent({
  children,
  className,
  container,
  keyboardAware = false,
  ...props
}: DrawerContentProps) {
  const defaultHost = useUiPortalHost();
  const portalHost = container ?? defaultHost;
  const { modal, showSwipeHandle, swipeDirection } = useDrawer();
  if (!portalHost) return null;
  const swipeAxis = swipeDirection === "down" || swipeDirection === "up"
    ? "y"
    : "x";
  const portal = (
    <DrawerPrimitive.Portal data-slot="drawer-portal" container={portalHost}>
      <UiPortalEventBoundary>
        {modal === true && <DrawerOverlay />}
        <DrawerPrimitive.Viewport
          data-modal={modal}
          data-slot="drawer-viewport"
          className="fcr-ui-drawer-viewport"
        >
          <DrawerPrimitive.Popup
            data-slot="drawer-popup"
            data-swipe-axis={swipeAxis}
            className={cn("fcr-ui-drawer-popup", className)}
            {...props}
          >
            {showSwipeHandle && <DrawerSwipeHandle />}
            <DrawerPrimitive.Content
              data-slot="drawer-content"
              className="fcr-ui-drawer-content"
            >
              {children}
            </DrawerPrimitive.Content>
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </UiPortalEventBoundary>
    </DrawerPrimitive.Portal>
  );
  return keyboardAware
    ? <DrawerPrimitive.VirtualKeyboardProvider>{portal}</DrawerPrimitive.VirtualKeyboardProvider>
    : portal;
}

function DrawerHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("fcr-ui-drawer-header", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("fcr-ui-drawer-footer", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("fcr-ui-drawer-title", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("fcr-ui-drawer-description", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerSwipeHandle,
  DrawerTitle,
  DrawerTrigger,
};
