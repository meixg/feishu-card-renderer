import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { UiPortalEventBoundary } from "../../renderer/portal";

const Combobox = ComboboxPrimitive.Root;
const ComboboxValue = ComboboxPrimitive.Value;

function ComboboxTrigger(props: ComboboxPrimitive.Trigger.Props) {
  const { children, ...rest } = props;
  return <ComboboxPrimitive.Trigger data-slot="combobox-trigger" {...rest}>
    {children}<ChevronDownIcon aria-hidden="true" />
  </ComboboxPrimitive.Trigger>;
}

function ComboboxContent({
  anchor,
  children,
  container,
  label,
}: {
  anchor: RefObject<HTMLElement | null>;
  children: ReactNode;
  container: HTMLElement;
  label: string;
}) {
  return <ComboboxPrimitive.Portal container={container}>
    <UiPortalEventBoundary>
      <ComboboxPrimitive.Positioner
        align="start"
        anchor={anchor}
        data-slot="combobox-positioner"
        sideOffset={6}
      >
        <ComboboxPrimitive.Popup aria-label={label} data-slot="combobox-content">
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </UiPortalEventBoundary>
  </ComboboxPrimitive.Portal>;
}

function ComboboxList(props: ComboboxPrimitive.List.Props) {
  return <ComboboxPrimitive.List data-slot="combobox-list" {...props} />;
}

function ComboboxItem(props: ComboboxPrimitive.Item.Props) {
  const { children, ...rest } = props;
  return <ComboboxPrimitive.Item data-slot="combobox-item" {...rest}>
    {children}
    <ComboboxPrimitive.ItemIndicator data-slot="combobox-item-indicator">
      <CheckIcon aria-hidden="true" />
    </ComboboxPrimitive.ItemIndicator>
  </ComboboxPrimitive.Item>;
}

function ComboboxEmpty(props: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" {...props} />;
}

function ComboboxChips(props: ComboboxPrimitive.Chips.Props) {
  return <ComboboxPrimitive.Chips data-slot="combobox-chips" {...props} />;
}

function ComboboxChip({
  children,
  removeLabel,
  ...rest
}: ComboboxPrimitive.Chip.Props & { removeLabel: string }) {
  return <ComboboxPrimitive.Chip data-slot="combobox-chip" {...rest}>
    {children}
    <ComboboxPrimitive.ChipRemove
      aria-label={removeLabel}
      data-slot="combobox-chip-remove"
    >
      <XIcon aria-hidden="true" />
    </ComboboxPrimitive.ChipRemove>
  </ComboboxPrimitive.Chip>;
}

function ComboboxChipsInput(props: ComboboxPrimitive.Input.Props) {
  return <ComboboxPrimitive.Input data-slot="combobox-chip-input" {...props} />;
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
};
