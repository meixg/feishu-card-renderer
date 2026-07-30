import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { UiPortalEventBoundary } from "../../renderer/portal";

const Select = SelectPrimitive.Root;

function SelectTrigger(props: SelectPrimitive.Trigger.Props) {
  const { children, ...rest } = props;
  return <SelectPrimitive.Trigger data-slot="select-trigger" {...rest}>
    {children}
    <SelectPrimitive.Icon aria-hidden="true"><ChevronDownIcon /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>;
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectContent({
  children,
  container,
}: {
  children: ReactNode;
  container: HTMLElement;
}) {
  return <SelectPrimitive.Portal container={container}>
    <UiPortalEventBoundary>
      <SelectPrimitive.Positioner
        align="start"
        alignItemWithTrigger={false}
        data-slot="select-positioner"
        sideOffset={4}
      >
        <SelectPrimitive.Popup data-slot="select-content">
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </UiPortalEventBoundary>
  </SelectPrimitive.Portal>;
}

function SelectItem(props: SelectPrimitive.Item.Props) {
  const { children, ...rest } = props;
  return <SelectPrimitive.Item data-slot="select-item" {...rest}>
    <SelectPrimitive.ItemIndicator data-slot="select-item-indicator">
      <CheckIcon aria-hidden="true" />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>;
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
