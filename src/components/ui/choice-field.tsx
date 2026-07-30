import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import {
  SearchIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { UiPortalEventBoundary } from "@/renderer/portal";
import { useUiPortalHost } from "@/renderer/portal-context";
import { Button } from "./button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "./combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

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
  invalid?: boolean;
  controlRef?: (control: HTMLElement | null) => void;
  onValueChange: (value: string | string[]) => void;
}>;

const DISPLAY_LIMIT = 100;
const CHIP_LIMIT = 3;

function choiceCopy(locale: string) {
  const zh = locale.toLowerCase().startsWith("zh");
  return zh
    ? {
        close: "关闭选择器",
        done: "完成",
        empty: "没有匹配项",
        loading: (count: number) => `正在加载 ${count} 个人员选项`,
        error: (count: number) => `${count} 个人员选项加载失败`,
        options: (label: string) => `${label}选项`,
        open: (label: string) => `${label}，打开选项`,
        remove: (label: string) => `移除 ${label}`,
        search: (label: string) => `搜索${label}`,
        searchDescription: "搜索并选择已有选项",
        searchPlaceholder: "搜索选项",
        selectDescription: "选择已有选项",
        status: (total: number) => total > DISPLAY_LIMIT
          ? `显示前 ${DISPLAY_LIMIT} 项，共 ${total} 项，请继续输入以缩小范围`
          : `${total} 个匹配项`,
        resourceStatus: (label: string) => `${label}人员解析状态`,
      }
    : {
        close: "Close selector",
        done: "Done",
        empty: "No matches",
        loading: (count: number) => `Loading ${count} person option${count === 1 ? "" : "s"}`,
        error: (count: number) => `${count} person option${count === 1 ? "" : "s"} failed to load`,
        options: (label: string) => `${label} options`,
        open: (label: string) => `${label}, open options`,
        remove: (label: string) => `Remove ${label}`,
        search: (label: string) => `Search ${label}`,
        searchDescription: "Search and select from the available options",
        searchPlaceholder: "Search options",
        selectDescription: "Select from the available options",
        status: (total: number) => total > DISPLAY_LIMIT
          ? `Showing the first ${DISPLAY_LIMIT} of ${total} matches; refine your search`
          : `${total} match${total === 1 ? "" : "es"}`,
        resourceStatus: (label: string) => `${label} person resolution status`,
      };
}

function normalizedSearch(value: string, locale: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  try {
    return compact.toLocaleLowerCase(locale);
  } catch {
    return compact.toLowerCase();
  }
}

function ChoiceItems({
  options,
}: {
  options: readonly ChoiceOption[];
}) {
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

function ChoiceStatus({
  locale,
  pc = false,
  total,
}: {
  locale: string;
  pc?: boolean;
  total: number;
}) {
  const copy = choiceCopy(locale);
  const className = pc ? "fcr-choice-pc-status" : "fcr-choice-status";
  return (
    <>
      <ComboboxPrimitive.Empty className={className}>
        {copy.empty}
      </ComboboxPrimitive.Empty>
      <ComboboxPrimitive.Status className={className}>
        {copy.status(total)}
      </ComboboxPrimitive.Status>
    </>
  );
}

function ChoiceResourceStatus({
  label,
  locale,
  options,
}: {
  label: string;
  locale: string;
  options: readonly ChoiceOption[];
}) {
  const loading = options.filter((option) =>
    option.resourceState === "loading").length;
  const errors = options.filter((option) =>
    option.resourceState === "error").length;
  const copy = choiceCopy(locale);
  const messages = [
    loading > 0 ? copy.loading(loading) : "",
    errors > 0 ? copy.error(errors) : "",
  ].filter(Boolean);
  if (messages.length === 0) return null;
  return (
    <span
      aria-atomic="true"
      aria-label={copy.resourceStatus(label)}
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
  locale,
  pc = false,
  value,
}: {
  disabled: boolean;
  multiple: boolean;
  onRemove: (token: string) => void;
  optionByToken: ReadonlyMap<string, ChoiceOption>;
  placeholder: string;
  locale: string;
  pc?: boolean;
  value: string | readonly string[];
}) {
  if (!multiple) {
    const token = typeof value === "string" ? value : "";
    return (
      <span className={pc ? "fcr-choice-pc-value" : "fcr-choice-value"}>
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
            aria-label={choiceCopy(locale).remove(
              optionByToken.get(token)?.label || token,
            )}
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
    <Select
      disabled={props.disabled}
      items={items}
      onValueChange={(token) => {
        if (typeof token === "string") props.onValueChange(token);
      }}
      required={props.required}
      value={selected || null}
    >
      <SelectTrigger
        ref={props.controlRef}
        aria-describedby={props.describedBy}
        aria-invalid={props.invalid || undefined}
        aria-label={props.label}
        aria-required={props.required}
        className="fcr-choice-pc-trigger"
        data-slot="select-trigger"
        data-choice-kind="select"
        data-option-count={props.options.length}
        data-placeholder-text={props.placeholder}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <SelectValue placeholder={props.placeholder} />
      </SelectTrigger>
      {portalHost && (
        <SelectContent container={portalHost}>
          {props.options.map((option) => (
            <SelectItem
              className="fcr-choice-pc-option"
              disabled={option.disabled}
              key={option.token}
              label={option.label}
              value={option.token}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      )}
    </Select>
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
  const singleControl = (
    <div
      ref={anchorRef}
      className="fcr-choice-pc-anchor"
      data-choice-kind="combobox"
      data-multiple={undefined}
      data-option-count={props.options.length}
      data-placeholder-text={props.placeholder}
    >
      <ComboboxTrigger
        ref={props.controlRef}
        aria-describedby={props.describedBy}
        aria-invalid={props.invalid || undefined}
        aria-label={props.label}
        aria-required={props.required}
        className="fcr-choice-pc-trigger"
        disabled={props.disabled}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <SelectedValue
          disabled={props.disabled}
          multiple={false}
          onRemove={() => {}}
          optionByToken={optionByToken}
          placeholder={props.placeholder}
          locale={props.locale}
          pc
          value={props.value}
        />
      </ComboboxTrigger>
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
  const search = (
    <div className="fcr-choice-pc-search-group" data-slot="combobox-input">
      <SearchIcon aria-hidden="true" />
      <ComboboxPrimitive.Input
        aria-expanded={open}
        aria-label={choiceCopy(props.locale).search(props.label)}
        autoComplete="off"
          className="fcr-choice-pc-search"
        placeholder={choiceCopy(props.locale).searchPlaceholder}
      />
    </div>
  );
  const content = (
    <>
      {!props.multiple && search}
      <ComboboxList className="fcr-choice-pc-list">
        {filtered.visible.map((option) => (
          <ComboboxItem
            className="fcr-choice-pc-option"
            disabled={option.disabled}
            key={option.token}
            value={option.token}
          >
            <span>{option.label}</span>
          </ComboboxItem>
        ))}
      </ComboboxList>
      <ChoiceStatus locale={props.locale} pc total={filtered.total} />
      {props.multiple && (
        <Button
          className="fcr-choice-pc-done"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
          type="button"
        >
          {choiceCopy(props.locale).done}
        </Button>
      )}
    </>
  );
  if (props.multiple) {
    const value = Array.isArray(props.value) ? [...props.value] : [];
    return (
      <Combobox
        {...shared}
        multiple
        onValueChange={(tokens) => props.onValueChange(tokens)}
        value={value}
      >
        <ComboboxChips
          ref={anchorRef}
          aria-invalid={props.invalid || undefined}
          aria-required={props.required}
          className="fcr-choice-pc-chips"
          data-choice-kind="combobox"
          data-multiple=""
          data-option-count={props.options.length}
          data-placeholder-text={props.placeholder}
        >
          <ComboboxValue>
            {(tokens: string[]) => <>
              {tokens.slice(0, CHIP_LIMIT).map((token) => {
                const label = optionByToken.get(token)?.label || token;
                return <ComboboxChip
                  key={token}
                  removeLabel={choiceCopy(props.locale).remove(label)}
                >
                  <span>{label}</span>
                </ComboboxChip>;
              })}
              {tokens.length > CHIP_LIMIT && (
                <span className="fcr-choice-pc-chip-count">
                  +{tokens.length - CHIP_LIMIT}
                </span>
              )}
              <ComboboxChipsInput
                ref={props.controlRef as (node: HTMLInputElement | null) => void}
                aria-describedby={props.describedBy}
                aria-label={choiceCopy(props.locale).search(props.label)}
                autoComplete="off"
                disabled={props.disabled}
                placeholder={tokens.length === 0 ? props.placeholder : ""}
              />
            </>}
          </ComboboxValue>
          <ComboboxTrigger
            aria-label={choiceCopy(props.locale).open(props.label)}
            disabled={props.disabled}
          />
        </ComboboxChips>
        {portalHost && (
          <ComboboxContent
            anchor={anchorRef}
            container={portalHost}
            label={choiceCopy(props.locale).options(props.label)}
          >
            {content}
          </ComboboxContent>
        )}
      </Combobox>
    );
  }
  const value = typeof props.value === "string" ? props.value : "";
  return (
    <Combobox
      {...shared}
      onValueChange={(token) => {
        if (typeof token !== "string") return;
        props.onValueChange(token);
        setOpen(false);
      }}
      value={value || null}
    >
      {singleControl}
      {portalHost && (
        <ComboboxContent
          anchor={anchorRef}
          container={portalHost}
          label={choiceCopy(props.locale).options(props.label)}
        >
          {content}
        </ComboboxContent>
      )}
    </Combobox>
  );
}

function MobileDrawer(props: ChoiceFieldProps) {
  const portalHost = useUiPortalHost();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
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
      {props.searchable && (
        <ComboboxPrimitive.Input
          aria-expanded={open}
          aria-label={choiceCopy(props.locale).search(props.label)}
          autoComplete="off"
          className="fcr-choice-search"
          placeholder={choiceCopy(props.locale).searchPlaceholder}
          ref={inputRef}
        />
      )}
      <ComboboxPrimitive.List className="fcr-choice-list">
        <ChoiceItems options={filtered.visible} />
      </ComboboxPrimitive.List>
      <ChoiceStatus locale={props.locale} total={filtered.total} />
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
          locale={props.locale}
          value={props.value}
        />
        <DrawerPrimitive.Trigger
          ref={props.controlRef}
          aria-describedby={props.describedBy}
          aria-invalid={props.invalid || undefined}
          aria-label={choiceCopy(props.locale).open(props.label)}
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
                  initialFocus={props.searchable ? inputRef : closeRef}
                >
                  <DrawerPrimitive.Content className="fcr-drawer-content">
                    <div className="fcr-drawer-handle" aria-hidden="true" />
                    <div className="fcr-drawer-header">
                      <DrawerPrimitive.Title>{props.label}</DrawerPrimitive.Title>
                      <DrawerPrimitive.Description className="fcr-sr-only">
                        {props.searchable
                          ? choiceCopy(props.locale).searchDescription
                          : choiceCopy(props.locale).selectDescription}
                      </DrawerPrimitive.Description>
                      <DrawerPrimitive.Close
                        ref={closeRef}
                        aria-label={choiceCopy(props.locale).close}
                      >
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
                        {choiceCopy(props.locale).done}
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
      <ChoiceResourceStatus
        label={props.label}
        locale={props.locale}
        options={props.options}
      />
    </>
  );
}
