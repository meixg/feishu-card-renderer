import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { useMemo, useRef, useState } from "react";

import { UiPortalEventBoundary } from "@/renderer/portal";
import { useUiPortalHost } from "@/renderer/portal-context";

export type ChoiceOption = Readonly<{
  token: string;
  label: string;
  searchText: string;
  disabled: boolean;
  resourceState?: "loading" | "error";
}>;

type ChoiceFieldProps = Readonly<{
  label: string;
  placeholder: string;
  options: readonly ChoiceOption[];
  locale: string;
  value: string | readonly string[];
  multiple: boolean;
  searchable: boolean;
  mobile: boolean;
  disabled: boolean;
  required?: boolean;
  describedBy?: string;
  onValueChange: (value: string | string[]) => void;
}>;

const DISPLAY_LIMIT = 100;
const CHIP_LIMIT = 3;

function normalizedSearch(value: string, locale: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  try {
    return compact.toLocaleLowerCase(locale);
  } catch {
    return compact.toLowerCase();
  }
}

function ChoiceItems({ options }: { options: readonly ChoiceOption[] }) {
  return options.map((option) => (
    <ComboboxPrimitive.Item
      className="fcr-choice-option"
      disabled={option.disabled}
      key={option.token}
      value={option.token}
    >
      <ComboboxPrimitive.ItemIndicator className="fcr-choice-indicator">
        ✓
      </ComboboxPrimitive.ItemIndicator>
      <span>{option.label}</span>
    </ComboboxPrimitive.Item>
  ));
}

function ChoiceStatus({ total }: { total: number }) {
  return (
    <>
      <ComboboxPrimitive.Empty className="fcr-choice-status">
        没有匹配项
      </ComboboxPrimitive.Empty>
      <ComboboxPrimitive.Status className="fcr-choice-status">
        {total > DISPLAY_LIMIT
          ? `显示前 ${DISPLAY_LIMIT} 项，共 ${total} 项，请继续输入以缩小范围`
          : `${total} 个匹配项`}
      </ComboboxPrimitive.Status>
    </>
  );
}

function ChoiceResourceStatus({
  label,
  options,
}: {
  label: string;
  options: readonly ChoiceOption[];
}) {
  const loading = options.filter((option) =>
    option.resourceState === "loading").length;
  const errors = options.filter((option) =>
    option.resourceState === "error").length;
  const messages = [
    loading > 0 ? `正在加载 ${loading} 个人员选项` : "",
    errors > 0 ? `${errors} 个人员选项加载失败` : "",
  ].filter(Boolean);
  if (messages.length === 0) return null;
  return (
    <span
      aria-atomic="true"
      aria-label={`${label}人员解析状态`}
      aria-live="polite"
      className="fcr-sr-only"
      role="status"
    >
      {messages.join("；")}
    </span>
  );
}

function SelectedValue({
  disabled,
  multiple,
  onRemove,
  optionByToken,
  placeholder,
  value,
}: {
  disabled: boolean;
  multiple: boolean;
  onRemove: (token: string) => void;
  optionByToken: ReadonlyMap<string, ChoiceOption>;
  placeholder: string;
  value: string | readonly string[];
}) {
  if (!multiple) {
    const token = typeof value === "string" ? value : "";
    return (
      <span className="fcr-choice-value">
        {optionByToken.get(token)?.label || placeholder}
      </span>
    );
  }
  const tokens = Array.isArray(value) ? value : [];
  if (tokens.length === 0) {
    return <span className="fcr-choice-placeholder">{placeholder}</span>;
  }
  const visible = tokens.slice(0, CHIP_LIMIT);
  return (
    <span className="fcr-choice-chips">
      {visible.map((token) => (
        <span className="fcr-choice-chip" key={token}>
          <span>{optionByToken.get(token)?.label || token}</span>
          <button
            aria-label={`移除 ${optionByToken.get(token)?.label || token}`}
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove(token);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            type="button"
          >
            ×
          </button>
        </span>
      ))}
      {tokens.length > CHIP_LIMIT && (
        <span className="fcr-choice-chip-count">+{tokens.length - CHIP_LIMIT}</span>
      )}
    </span>
  );
}

function SelectField(props: ChoiceFieldProps) {
  const portalHost = useUiPortalHost();
  const selected = typeof props.value === "string" ? props.value : "";
  const items = useMemo(
    () => props.options.map(({ label, token }) => ({ label, value: token })),
    [props.options],
  );
  return (
    <SelectPrimitive.Root
      disabled={props.disabled}
      items={items}
      onValueChange={(token) => {
        if (typeof token === "string") props.onValueChange(token);
      }}
      required={props.required}
      value={selected || null}
    >
      <SelectPrimitive.Trigger
        aria-describedby={props.describedBy}
        aria-label={props.label}
        aria-required={props.required}
        className="fcr-choice-trigger"
        data-choice-kind="select"
        data-option-count={props.options.length}
        data-placeholder-text={props.placeholder}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <SelectPrimitive.Value placeholder={props.placeholder} />
        <SelectPrimitive.Icon aria-hidden="true">⌄</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      {portalHost && (
        <SelectPrimitive.Portal container={portalHost}>
          <UiPortalEventBoundary>
            <SelectPrimitive.Positioner
              align="start"
              alignItemWithTrigger={false}
              className="fcr-choice-positioner"
              sideOffset={4}
            >
              <SelectPrimitive.Popup className="fcr-choice-popup">
                <SelectPrimitive.List>
                  {props.options.map((option) => (
                    <SelectPrimitive.Item
                      className="fcr-choice-option"
                      disabled={option.disabled}
                      key={option.token}
                      label={option.label}
                      value={option.token}
                    >
                      <SelectPrimitive.ItemIndicator
                        className="fcr-choice-indicator"
                      >
                        ✓
                      </SelectPrimitive.ItemIndicator>
                      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.List>
              </SelectPrimitive.Popup>
            </SelectPrimitive.Positioner>
          </UiPortalEventBoundary>
        </SelectPrimitive.Portal>
      )}
    </SelectPrimitive.Root>
  );
}

function useFilteredOptions(
  options: readonly ChoiceOption[],
  query: string,
  locale: string,
) {
  return useMemo(() => {
    const needle = normalizedSearch(query, locale);
    const matches = needle
      ? options.filter((option) =>
          normalizedSearch(option.searchText, locale).includes(needle))
      : [...options];
    return { total: matches.length, visible: matches.slice(0, DISPLAY_LIMIT) };
  }, [locale, options, query]);
}

function PopupCombobox(props: ChoiceFieldProps) {
  const portalHost = useUiPortalHost();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useFilteredOptions(props.options, query, props.locale);
  const optionByToken = useMemo(
    () => new Map(props.options.map((option) => [option.token, option])),
    [props.options],
  );
  const allTokens = useMemo(
    () => props.options.map((option) => option.token),
    [props.options],
  );
  const visibleTokens = useMemo(
    () => filtered.visible.map((option) => option.token),
    [filtered.visible],
  );
  const remove = (token: string) => {
    if (!Array.isArray(props.value)) return;
    props.onValueChange(props.value.filter((item) => item !== token));
  };
  const control = (
    <div
      ref={anchorRef}
      className="fcr-choice-control"
      data-choice-kind="combobox"
      data-multiple={props.multiple || undefined}
      data-option-count={props.options.length}
      data-placeholder-text={props.placeholder}
    >
      <SelectedValue
        disabled={props.disabled}
        multiple={props.multiple}
        onRemove={remove}
        optionByToken={optionByToken}
        placeholder={props.placeholder}
        value={props.value}
      />
      <ComboboxPrimitive.Trigger
        aria-describedby={props.describedBy}
        aria-label={props.multiple ? `${props.label}，打开选项` : props.label}
        aria-required={props.required}
        className="fcr-choice-open"
        disabled={props.disabled}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        ⌄
      </ComboboxPrimitive.Trigger>
    </div>
  );
  const shared = {
    disabled: props.disabled,
    filteredItems: visibleTokens,
    filter: null,
    inputValue: query,
    itemToStringLabel: (token: string) => optionByToken.get(token)?.label ?? "",
    items: allTokens,
    onInputValueChange: (next: string) => setQuery(next),
    onOpenChange: (next: boolean) => {
      setOpen(next);
      if (!next) setQuery("");
    },
    open,
  } as const;
  const content = (
    <>
      <ComboboxPrimitive.Input
        aria-expanded={open}
        aria-label={`搜索${props.label}`}
        autoComplete="off"
        className="fcr-choice-search"
        placeholder="搜索选项"
      />
      <ComboboxPrimitive.List className="fcr-choice-list">
        <ChoiceItems options={filtered.visible} />
      </ComboboxPrimitive.List>
      <ChoiceStatus total={filtered.total} />
      {props.multiple && (
        <button
          className="fcr-choice-done"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
          type="button"
        >
          完成
        </button>
      )}
    </>
  );
  if (props.multiple) {
    const value = Array.isArray(props.value) ? [...props.value] : [];
    return (
      <ComboboxPrimitive.Root
        {...shared}
        multiple
        onValueChange={(tokens) => props.onValueChange(tokens)}
        value={value}
      >
        {control}
        {portalHost && (
          <ComboboxPrimitive.Portal container={portalHost}>
            <UiPortalEventBoundary>
              <ComboboxPrimitive.Positioner
                align="start"
                anchor={anchorRef}
                className="fcr-choice-positioner"
                sideOffset={4}
              >
                <ComboboxPrimitive.Popup
                  aria-label={`${props.label}选项`}
                  className="fcr-choice-popup"
                >
                  {content}
                </ComboboxPrimitive.Popup>
              </ComboboxPrimitive.Positioner>
            </UiPortalEventBoundary>
          </ComboboxPrimitive.Portal>
        )}
      </ComboboxPrimitive.Root>
    );
  }
  const value = typeof props.value === "string" ? props.value : "";
  return (
    <ComboboxPrimitive.Root
      {...shared}
      onValueChange={(token) => {
        if (typeof token !== "string") return;
        props.onValueChange(token);
        setOpen(false);
      }}
      value={value || null}
    >
      {control}
      {portalHost && (
        <ComboboxPrimitive.Portal container={portalHost}>
          <UiPortalEventBoundary>
            <ComboboxPrimitive.Positioner
              align="start"
              anchor={anchorRef}
              className="fcr-choice-positioner"
              sideOffset={4}
            >
              <ComboboxPrimitive.Popup
                aria-label={`${props.label}选项`}
                className="fcr-choice-popup"
              >
                {content}
              </ComboboxPrimitive.Popup>
            </ComboboxPrimitive.Positioner>
          </UiPortalEventBoundary>
        </ComboboxPrimitive.Portal>
      )}
    </ComboboxPrimitive.Root>
  );
}

function MobileDrawer(props: ChoiceFieldProps) {
  const portalHost = useUiPortalHost();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useFilteredOptions(props.options, query, props.locale);
  const optionByToken = useMemo(
    () => new Map(props.options.map((option) => [option.token, option])),
    [props.options],
  );
  const allTokens = useMemo(
    () => props.options.map((option) => option.token),
    [props.options],
  );
  const visibleTokens = useMemo(
    () => filtered.visible.map((option) => option.token),
    [filtered.visible],
  );
  const remove = (token: string) => {
    if (!Array.isArray(props.value)) return;
    props.onValueChange(props.value.filter((item) => item !== token));
  };
  const list = (
    <>
      <ComboboxPrimitive.Input
        aria-expanded={open}
        aria-label={`搜索${props.label}`}
        autoComplete="off"
        className="fcr-choice-search"
        placeholder="搜索选项"
        ref={inputRef}
      />
      <ComboboxPrimitive.List className="fcr-choice-list">
        <ChoiceItems options={filtered.visible} />
      </ComboboxPrimitive.List>
      <ChoiceStatus total={filtered.total} />
    </>
  );
  const shared = {
    disabled: props.disabled,
    filter: null,
    filteredItems: visibleTokens,
    inline: true,
    inputValue: query,
    itemToStringLabel: (token: string) => optionByToken.get(token)?.label ?? "",
    items: allTokens,
    onInputValueChange: (next: string) => setQuery(next),
    open,
  } as const;
  return (
    <DrawerPrimitive.Root
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      open={open}
      swipeDirection="down"
    >
      <div
        className="fcr-choice-control"
        data-choice-kind="drawer"
        data-multiple={props.multiple || undefined}
        data-option-count={props.options.length}
        data-placeholder-text={props.placeholder}
      >
        <SelectedValue
          disabled={props.disabled}
          multiple={props.multiple}
          onRemove={remove}
          optionByToken={optionByToken}
          placeholder={props.placeholder}
          value={props.value}
        />
        <DrawerPrimitive.Trigger
          aria-describedby={props.describedBy}
          aria-label={`${props.label}，打开选项`}
          aria-required={props.required}
          className="fcr-choice-open"
          disabled={props.disabled}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          ⌄
        </DrawerPrimitive.Trigger>
      </div>
      {portalHost && (
        <DrawerPrimitive.Portal container={portalHost}>
          <UiPortalEventBoundary>
            <DrawerPrimitive.VirtualKeyboardProvider>
              <DrawerPrimitive.Backdrop className="fcr-drawer-backdrop" />
              <DrawerPrimitive.Viewport className="fcr-drawer-viewport">
                <DrawerPrimitive.Popup
                  className="fcr-drawer-popup"
                  initialFocus={inputRef}
                >
                  <DrawerPrimitive.Content className="fcr-drawer-content">
                    <div className="fcr-drawer-handle" aria-hidden="true" />
                    <div className="fcr-drawer-header">
                      <DrawerPrimitive.Title>{props.label}</DrawerPrimitive.Title>
                      <DrawerPrimitive.Description className="fcr-sr-only">
                        搜索并选择已有选项
                      </DrawerPrimitive.Description>
                      <DrawerPrimitive.Close aria-label="关闭选择器">
                        ×
                      </DrawerPrimitive.Close>
                    </div>
                    {props.multiple ? (
                      <ComboboxPrimitive.Root
                        {...shared}
                        multiple
                        onValueChange={(tokens) => props.onValueChange(tokens)}
                        value={Array.isArray(props.value) ? [...props.value] : []}
                      >
                        {list}
                      </ComboboxPrimitive.Root>
                    ) : (
                      <ComboboxPrimitive.Root
                        {...shared}
                        onValueChange={(token) => {
                          if (typeof token !== "string") return;
                          props.onValueChange(token);
                          setOpen(false);
                        }}
                        value={typeof props.value === "string"
                          ? props.value || null
                          : null}
                      >
                        {list}
                      </ComboboxPrimitive.Root>
                    )}
                    {props.multiple && (
                      <button
                        className="fcr-choice-done"
                        onClick={() => setOpen(false)}
                        type="button"
                      >
                        完成
                      </button>
                    )}
                  </DrawerPrimitive.Content>
                </DrawerPrimitive.Popup>
              </DrawerPrimitive.Viewport>
            </DrawerPrimitive.VirtualKeyboardProvider>
          </UiPortalEventBoundary>
        </DrawerPrimitive.Portal>
      )}
    </DrawerPrimitive.Root>
  );
}

export function ChoiceField(props: ChoiceFieldProps) {
  const field = props.mobile
    ? <MobileDrawer {...props} />
    : !props.multiple && !props.searchable
      ? <SelectField {...props} />
      : <PopupCombobox {...props} />;
  return (
    <>
      {field}
      <ChoiceResourceStatus label={props.label} options={props.options} />
    </>
  );
}
