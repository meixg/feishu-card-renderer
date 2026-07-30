import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ButtonElement, CheckerElement, DatePickerElement, DateTimePickerElement,
  InputElement, MultiSelectPersonElement, MultiSelectStaticElement,
  OptionValue, OverflowElement, SelectImageElement, SelectOption, SelectPersonElement,
  SelectStaticElement, TimePickerElement,
} from "../../schema/components";
import { useRecursiveContext, useRendererContext } from "../../renderer/context";
import {
  actionsFor, browserTimezone, serializableValue, sourceFor,
} from "../../interactions/behaviors";
import { ConfirmDialog } from "../primitives/ConfirmDialog";
import { useImageResource, usePersonResource } from "../../renderer/resources";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  ChoiceField,
  type ChoiceOption,
} from "../ui/choice-field";
import { Button as UiButton } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Checkbox } from "../ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../ui/field";
import { Input as UiInput } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Textarea } from "../ui/textarea";
import { EllipsisIcon } from "lucide-react";

type InteractiveElement = InputElement | SelectStaticElement |
  MultiSelectStaticElement | SelectPersonElement | MultiSelectPersonElement |
  DatePickerElement | TimePickerElement | DateTimePickerElement |
  SelectImageElement | CheckerElement;

const empty = (value: unknown) => value === "" || value == null ||
  (Array.isArray(value) && value.length === 0);
const optionText = (option: SelectOption) => option.text?.content ??
  (typeof option.value === "string" || typeof option.value === "number" ||
    typeof option.value === "boolean" ? String(option.value) : "");
const checkerMissing = (value: unknown) => value !== true;

function useElementIds(path: string) {
  const { domIdPrefix } = useRendererContext();
  const pathId = path.replace(/[^A-Za-z0-9_-]/g, "-");
  const prefix = `${domIdPrefix}-${pathId}`;
  return {
    choiceName: `${prefix}-choice`,
    control: `${prefix}-control`,
    description: `${prefix}-description`,
    error: `${prefix}-error`,
    label: `${prefix}-label`,
  };
}

function useTips(element: {
  disabled?: boolean;
  hover_tips?: { content?: string };
  disabled_tips?: { content?: string };
}, descriptionId: string) {
  const tips = [
    element.hover_tips?.content,
    element.disabled ? element.disabled_tips?.content : undefined,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  const describedBy = tips.length > 0 ? descriptionId : undefined;
  return {
    describedBy,
    nodes: tips.length > 0
      ? <FieldDescription id={describedBy} className="fcr-field-tips">
          {tips.map((tip, index) => <span key={index}>{tip}</span>)}
        </FieldDescription>
      : null,
  };
}

function fieldFeedback(
  errorId: string,
  describedBy: string | undefined,
  invalid: boolean,
) {
  return {
    describedBy: [describedBy, invalid ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined,
    error: invalid
      ? <FieldError id={errorId}>此项为必填项</FieldError>
      : null,
  };
}

const rawOptionValue = (option?: SelectOption): OptionValue | undefined => {
  if (!option) return undefined;
  if (typeof option.value === "number" && !Number.isFinite(option.value)) {
    return undefined;
  }
  return serializableValue(option.value) as OptionValue | undefined;
};
const optionToken = (path: string, index: number): string =>
  `${path}:option:${index}`;
const sameOptionValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null ||
    typeof right !== "object" || right === null) return false;
  try {
    return JSON.stringify(serializableValue(left)) ===
      JSON.stringify(serializableValue(right));
  } catch {
    return false;
  }
};
const includesOption = (values: unknown, target: OptionValue): boolean =>
  Array.isArray(values) && values.some((value) => sameOptionValue(value, target));

function useField(element: InteractiveElement, initial: unknown,
  dispatchWithoutBehavior = true, allowLocalWithoutAction = false,
  isMissing: (value: unknown) => boolean = empty) {
  const { form } = useRecursiveContext();
  const { onAction } = useRendererContext();
  const name = element.name;
  const [local, setLocal] = useState(initial);
  const [pending, setPending] = useState<unknown>();
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLElement>(null);
  const latestInitial = useRef(initial);
  latestInitial.current = initial;
  const registerField = form?.registerField;
  const updateField = form?.updateField;
  const setFieldControl = form?.setFieldControl;
  useEffect(() => {
    if (!registerField || !name) return;
    return registerField(name, element.tag, latestInitial.current, isMissing);
  }, [element.tag, isMissing, name, registerField]);
  useEffect(() => {
    if (!updateField || !name) return;
    updateField(name, element.tag, initial, element.required === true, isMissing);
  }, [element.required, element.tag, initial, isMissing, name, updateField]);
  const value = form && name && Object.hasOwn(form.values, name)
    ? form.values[name] : local;
  const controlRef = useCallback((control: HTMLElement | null) => {
    if (name && setFieldControl) setFieldControl(name, control);
  }, [name, setFieldControl]);
  const apply = (next: unknown, path: string, timezone = false) => {
    if (form && name) form.setValue(name, next);
    else {
      setLocal(next);
      const actions = actionsFor(element, path, {
        value: element.value ?? next,
        ...(timezone ? { timezone: browserTimezone() } : {}),
      });
      actions.forEach((action) => onAction?.(action));
      if (dispatchWithoutBehavior && actions.length === 0) onAction?.({
        type: "callback", source: sourceFor(element, path),
        value: element.value ?? next,
        ...(timezone ? { timezone: browserTimezone() } : {}),
      });
    }
  };
  const set = (next: unknown, path: string, timezone = false) => {
    if (!element.confirm) { apply(next, path, timezone); return; }
    trigger.current = document.activeElement as HTMLElement | null;
    setPending({ next, path, timezone });
    setConfirming(true);
  };
  return { value, set, controlRef,
    invalid: Boolean(form && name && form.invalidFields.has(name)),
    disabled: element.disabled === true ||
    (!form && !onAction && !allowLocalWithoutAction),
    confirmDialog: element.confirm
      ? <ConfirmDialog open={confirming}
          title={element.confirm.title} text={element.confirm.text}
          trigger={trigger} onCancel={() => setConfirming(false)}
          onConfirm={() => {
            const request = pending as { next: unknown; path: string; timezone: boolean };
            setConfirming(false);
            apply(request.next, request.path, request.timezone);
          }} />
      : null };
}

export function Input({ element, path }: { element: InputElement; path: string }) {
  const field = useField(element, element.default_value ?? "");
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const feedback = fieldFeedback(ids.error, tips.describedBy, field.invalid);
  const id = ids.control;
  const shared = { id, disabled: field.disabled, required: element.required,
    "aria-describedby": feedback.describedBy,
    "aria-invalid": field.invalid || undefined,
    maxLength: element.max_length, value: String(field.value ?? ""),
    placeholder: element.placeholder?.content,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      field.set(event.target.value, path) };
  return <><Field data-invalid={field.invalid || undefined}>
    <FieldLabel htmlFor={id}>
      {element.label?.content ?? element.name ?? "输入"}
    </FieldLabel>
    {element.input_type === "multiline_text"
      ? <Textarea ref={(node) => field.controlRef(node)}
          {...shared} rows={element.rows ?? 5} />
      : <UiInput ref={(node) => field.controlRef(node)}
          {...shared}
          type={element.input_type === "password" ? "password" : "text"} />}
    {tips.nodes}{feedback.error}
  </Field>{field.confirmDialog}</>;
}

type Single = SelectStaticElement | SelectPersonElement;
const SELECT_STATIC_SEARCH_THRESHOLD = 8;

type PersonResolution = Readonly<{
  status: "loading" | "ready" | "error";
  name?: string;
}>;

function PersonNameProbe({ id, token, onResolution }: {
  id: string;
  token: string;
  onResolution: (token: string, resolution: PersonResolution) => void;
}) {
  const resource = usePersonResource(id);
  const status = resource?.status ?? "error";
  const name = resource?.status === "ready" ? resource.value?.name : undefined;
  useEffect(
    () => onResolution(token, { status, ...(name ? { name } : {}) }),
    [name, onResolution, status, token],
  );
  return null;
}

function useChoiceOptions(
  element: Single | Multi,
  path: string,
): {
  choices: readonly ChoiceOption[];
  probes: React.ReactNode;
} {
  const [personResolutions, setPersonResolutions] = useState<
    Record<string, PersonResolution>
  >({});
  const isPerson = element.tag === "select_person" ||
    element.tag === "multi_select_person";
  const onResolution = useCallback((
    token: string,
    resolution: PersonResolution,
  ) => {
    setPersonResolutions((current) => {
      const previous = current[token];
      if (previous?.status === resolution.status &&
        previous.name === resolution.name) return current;
      return { ...current, [token]: resolution };
    });
  }, []);
  const choices = useMemo(() => (element.options ?? []).map((option, index) => {
    const token = optionToken(path, index);
    const raw = rawOptionValue(option);
    const supplied = isPerson ? option.text?.content ?? "" : optionText(option);
    const resolution = personResolutions[token];
    const resolved = resolution?.name;
    const fallback = resolution?.status === "loading"
      ? "人员信息加载中"
      : resolution?.status === "error"
        ? "人员信息不可用"
        : "未命名选项";
    const label = option.text?.content ?? resolved ?? (supplied || fallback);
    return {
      token,
      label,
      searchText: [label, supplied, resolved].filter(Boolean).join(" "),
      disabled: option.disabled === true || raw === undefined,
      ...(resolution?.status === "loading" || resolution?.status === "error"
        ? { resourceState: resolution.status }
        : {}),
    };
  }), [element.options, isPerson, path, personResolutions]);
  const probes = isPerson
    ? (element.options ?? []).map((option, index) => {
        const value = rawOptionValue(option);
        return typeof value === "string"
          ? <PersonNameProbe
              id={value}
              key={optionToken(path, index)}
              onResolution={onResolution}
              token={optionToken(path, index)}
            />
          : null;
      })
    : null;
  return { choices, probes };
}

export function SingleSelect({ element, path }: { element: Single; path: string }) {
  const indexed = typeof element.initial_index === "number"
    ? rawOptionValue(element.options?.[element.initial_index] as SelectOption)
    : undefined;
  const initial = element.initial_option ?? indexed ?? "";
  const field = useField(element, initial);
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const { device, locale } = useRendererContext();
  const { choices, probes } = useChoiceOptions(element, path);
  const selectedIndex = (element.options ?? []).findIndex((option) =>
    sameOptionValue(rawOptionValue(option), field.value));
  const label = element.label?.content ?? element.placeholder?.content ??
    element.name ?? "选择";
  const feedback = fieldFeedback(ids.error, tips.describedBy, field.invalid);
  return <><Field data-invalid={field.invalid || undefined}>
    <FieldLabel>{label}</FieldLabel>
    <ChoiceField
      controlRef={field.controlRef}
      describedBy={feedback.describedBy}
      disabled={field.disabled}
      invalid={field.invalid}
      label={label}
      locale={locale}
      mobile={device === "mobile"}
      multiple={false}
      onValueChange={(token) => {
        if (typeof token !== "string") return;
        const index = (element.options ?? []).findIndex((_, optionIndex) =>
          optionToken(path, optionIndex) === token);
        const value = index < 0 ? "" :
          rawOptionValue(element.options?.[index] as SelectOption);
        if (value !== undefined || index < 0) field.set(value ?? "", path);
      }}
      options={choices}
      placeholder={element.placeholder?.content ?? "请选择"}
      required={element.required}
      searchable={element.tag === "select_person" ||
        choices.length >= SELECT_STATIC_SEARCH_THRESHOLD}
      value={selectedIndex < 0 ? "" : optionToken(path, selectedIndex)}
    />
    {tips.nodes}{feedback.error}
  </Field>{probes}{field.confirmDialog}</>;
}

type Multi = MultiSelectStaticElement | MultiSelectPersonElement;
export function MultiSelect({ element, path }: { element: Multi; path: string }) {
  const field = useField(element, element.selected_values ?? []);
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const { device, locale } = useRendererContext();
  const { choices, probes } = useChoiceOptions(element, path);
  const selectedTokens = (element.options ?? []).flatMap((option, index) => {
    const value = rawOptionValue(option);
    return value !== undefined && includesOption(field.value, value)
      ? [optionToken(path, index)] : [];
  });
  const label = element.label?.content ?? element.name ?? "多选";
  const feedback = fieldFeedback(ids.error, tips.describedBy, field.invalid);
  return <><Field data-invalid={field.invalid || undefined}>
    <FieldLabel>{label}</FieldLabel>
    <ChoiceField
      controlRef={field.controlRef}
      describedBy={feedback.describedBy}
      disabled={field.disabled}
      invalid={field.invalid}
      label={label}
      locale={locale}
      mobile={device === "mobile"}
      multiple
      onValueChange={(tokens) => {
        if (!Array.isArray(tokens)) return;
        field.set(tokens.flatMap((token) => {
          const index = (element.options ?? []).findIndex((_, optionIndex) =>
            optionToken(path, optionIndex) === token);
          const value = index < 0 ? undefined :
            rawOptionValue(element.options?.[index] as SelectOption);
          return value === undefined ? [] : [value];
        }), path);
      }}
      options={choices}
      placeholder="请选择"
      required={element.required}
      searchable
      value={selectedTokens}
    />
    {tips.nodes}{feedback.error}
  </Field>{probes}{field.confirmDialog}</>;
}

type Picker = DatePickerElement | TimePickerElement | DateTimePickerElement;

function parseDateValue(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

function formatDateValue(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function Picker({ element, path }: { element: Picker; path: string }) {
  const tag = element.tag;
  const initial = tag === "date_picker" ? element.initial_date :
    tag === "picker_time" ? element.initial_time :
    element.initial_datetime?.replace(" ", "T");
  const field = useField(element, initial ?? "");
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const { device, locale } = useRendererContext();
  const [open, setOpen] = useState(false);
  const type = tag === "date_picker" ? "date" : tag === "picker_time" ? "time" :
    "datetime-local";
  const label = element.label?.content ?? element.name ?? "日期时间";
  const id = ids.control;
  const feedback = fieldFeedback(ids.error, tips.describedBy, field.invalid);
  const value = String(field.value ?? "");
  const selected = parseDateValue(value);
  return <><Field data-invalid={field.invalid || undefined}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    {tag === "date_picker" && device === "pc"
      ? <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<UiButton
              ref={(node) => field.controlRef(node)}
              id={id}
              type="button"
              variant="outline"
            />}
            aria-describedby={feedback.describedBy}
            aria-invalid={field.invalid || undefined}
            aria-label={`${label}：${value || "请选择"}`}
            aria-required={element.required || undefined}
            role="combobox"
            disabled={field.disabled}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <span>{value || "请选择"}</span>
            <svg aria-hidden="true" className="fcr-date-icon"
              viewBox="0 0 16 16">
              <path d="M4 1.5v2M12 1.5v2M2.5 6h11M3 3h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                fill="none" stroke="currentColor" strokeWidth="1.25" />
            </svg>
          </PopoverTrigger>
          <PopoverContent
            aria-label={`选择${label}`}
            initialFocus
            role="dialog"
          >
            <Calendar
              autoFocus
              defaultMonth={selected}
              mode="single"
              onSelect={(date) => {
                if (!date) return;
                field.set(formatDateValue(date), path, true);
                setOpen(false);
              }}
              rendererLocale={locale}
              selected={selected}
            />
          </PopoverContent>
        </Popover>
      : <UiInput
          ref={(node) => field.controlRef(node)}
          id={id}
          aria-describedby={feedback.describedBy}
          aria-invalid={field.invalid || undefined}
          aria-label={label}
          disabled={field.disabled}
          required={element.required}
          type={type}
          value={value}
          onChange={(event) => field.set(event.target.value, path, true)}
        />}
    {tips.nodes}{feedback.error}
  </Field>{field.confirmDialog}</>;
}

export function Checker({ element, path }: { element: CheckerElement; path: string }) {
  const field = useField(element, element.checked ?? false, false, true,
    checkerMissing);
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const id = ids.control;
  const feedback = fieldFeedback(ids.error, tips.describedBy, field.invalid);
  return <><Field data-invalid={field.invalid || undefined}>
    <div className="fcr-checker">
      <Checkbox
        ref={(node) => field.controlRef(node)}
        id={id}
        aria-describedby={feedback.describedBy}
        aria-invalid={field.invalid || undefined}
        checked={Boolean(field.value)}
        disabled={field.disabled}
        required={element.required}
        onCheckedChange={(checked) => field.set(checked, path)}
      />
      <FieldLabel htmlFor={id}>
        {element.text?.content ?? element.label?.content ??
          element.name ?? "确认"}
      </FieldLabel>
    </div>
    {tips.nodes}{feedback.error}
  </Field>{field.confirmDialog}</>;
}

function SelectImageVisual({ option }: { option: SelectOption }) {
  const resource = useImageResource(option.img_key);
  if (resource?.status === "ready" && resource.value) {
    return <img src={resource.value} alt="" />;
  }
  return option.img_key
    ? <span className="fcr-image-placeholder" aria-hidden="true"
        data-state={resource?.status ?? "missing"} />
    : null;
}

export function SelectImage({ element, path }: { element: SelectImageElement; path: string }) {
  const initial = element.multi_select ? element.selected_values ?? [] :
    element.selected_values?.[0] ?? "";
  const field = useField(element, initial);
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const label = element.label?.content ?? element.name ?? "选择图片";
  const labelId = ids.label;
  const feedback = fieldFeedback(ids.error, tips.describedBy, field.invalid);
  const options = element.options ?? [];
  const firstFocusableIndex = options.findIndex((option) =>
    rawOptionValue(option) !== undefined && option.disabled !== true);
  const selectedToken = options.findIndex((option) =>
    sameOptionValue(rawOptionValue(option), field.value));
  return <><Field data-invalid={field.invalid || undefined}>
    <FieldLabel id={labelId}>{label}</FieldLabel>
    <fieldset className="fcr-select-image"
      aria-describedby={feedback.describedBy}
      aria-invalid={field.invalid || undefined}
      aria-labelledby={labelId}
      disabled={field.disabled}>
      <legend className="fcr-sr-only">{label}</legend>
      {element.multi_select
        ? <div className="fcr-select-image-options">
            {options.map((option, index) => {
              const value = rawOptionValue(option);
              const token = optionToken(path, index);
              const checked = Array.isArray(field.value) &&
                value !== undefined && includesOption(field.value, value);
              return <label className="fcr-select-image-option" key={token}>
                <Checkbox
                  ref={index === firstFocusableIndex
                    ? (node) => field.controlRef(node)
                    : undefined}
                  checked={checked}
                  disabled={field.disabled || value === undefined ||
                    option.disabled}
                  onCheckedChange={() => {
                    if (value === undefined) return;
                    const next = checked
                      ? (field.value as OptionValue[])
                          .filter((item) => !sameOptionValue(item, value))
                      : [...(field.value as OptionValue[]), value];
                    field.set(next, path);
                  }}
                />
                <SelectImageVisual option={option} />
                <span>{optionText(option)}</span>
              </label>;
            })}
          </div>
        : <RadioGroup
            aria-describedby={feedback.describedBy}
            aria-invalid={field.invalid || undefined}
            aria-labelledby={labelId}
            disabled={field.disabled}
            name={ids.choiceName}
            required={element.required}
            value={selectedToken < 0 ? "" : optionToken(path, selectedToken)}
            onValueChange={(token) => {
              const index = options.findIndex((_, optionIndex) =>
                optionToken(path, optionIndex) === token);
              const value = index < 0
                ? undefined
                : rawOptionValue(options[index]);
              if (value !== undefined) field.set(value, path);
            }}
          >
            {options.map((option, index) => {
              const value = rawOptionValue(option);
              const token = optionToken(path, index);
              return <label className="fcr-select-image-option" key={token}>
                <RadioGroupItem
                  inputRef={index === firstFocusableIndex
                    ? (node) => field.controlRef(node)
                    : undefined}
                  disabled={field.disabled || value === undefined ||
                    option.disabled}
                  value={token}
                />
                <SelectImageVisual option={option} />
                <span>{optionText(option)}</span>
              </label>;
            })}
          </RadioGroup>}
    </fieldset>
    {tips.nodes}{feedback.error}
  </Field>{field.confirmDialog}</>;
}

export function Button({ element, path }: { element: ButtonElement; path: string }) {
  const { form } = useRecursiveContext();
  const { onAction } = useRendererContext();
  const [confirm, setConfirm] = useState(false);
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const trigger = useRef<HTMLButtonElement>(null);
  const business = element.form_action_type !== "reset";
  const validate = () => element.form_action_type === "submit" &&
    Boolean(form?.validateRequired());
  const run = (validated = false) => {
    if (element.form_action_type === "reset") { form?.reset(); return; }
    if (!validated && validate()) return;
    const extra = form
      ? { formValue: { ...form.values }, timezone: browserTimezone() }
      : {};
    const actions = actionsFor(element, path);
    const dispatch = form
      ? [...actions.filter(({ type }) => type === "callback").slice(0, 1)
          .map((action) => ({ ...action, ...extra })),
          ...actions.filter(({ type }) => type === "open_url")]
      : actions;
    if (dispatch.length) dispatch.forEach((action) => onAction?.(action));
    else if (element.form_action_type === "submit" ||
      !Array.isArray(element.behaviors) || element.behaviors.length === 0) {
      onAction?.({ type: "callback", source: sourceFor(element, path),
        ...(element.value !== undefined
          ? { value: serializableValue(element.value) } : {}), ...extra });
    }
  };
  const activate = () => {
    if (validate()) return;
    if (element.confirm) setConfirm(true);
    else run(true);
  };
  const variant = {
    default: "outline",
    primary: "default",
    secondary: "secondary",
    danger: "destructive",
    text: "ghost",
    primary_text: "link",
    danger_text: "destructive",
    primary_filled: "default",
    danger_filled: "destructive",
    laser: "secondary",
  }[element.type ?? "default"] as
    "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  const size = {
    small: "sm",
    medium: "default",
    large: "lg",
  }[element.size ?? "medium"] as "sm" | "default" | "lg";
  return <><UiButton ref={trigger}
    type={element.form_action_type === "submit" ? "submit" : "button"}
    variant={variant} size={size}
    className={element.width === "fill" ? "fcr-button-width-fill" : undefined}
    disabled={element.disabled || (business && !onAction)}
    aria-describedby={tips.describedBy}
    onKeyDown={(event) => event.stopPropagation()}
    onClick={(event) => { event.stopPropagation(); event.preventDefault(); activate(); }}>
    {element.text?.content ?? "按钮"}</UiButton>
    {tips.nodes}
    {element.confirm && <ConfirmDialog open={confirm}
      title={element.confirm.title} text={element.confirm.text}
      trigger={trigger} onCancel={() => setConfirm(false)}
      onConfirm={() => { setConfirm(false); run(); }} />}
  </>;
}

export function Overflow({ element, path }: { element: OverflowElement; path: string }) {
  const { onAction } = useRendererContext();
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const ids = useElementIds(path);
  const tips = useTips(element, ids.description);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="fcr-overflow">
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      disabled={element.disabled}
    >
      <DropdownMenuTrigger
        ref={trigger}
        render={<UiButton variant="outline" size="icon" />}
        aria-label="更多操作"
        disabled={element.disabled}
        aria-describedby={tips.describedBy}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <EllipsisIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="更多操作">
        {(element.options ?? []).map((option, index) =>
          <DropdownMenuItem
            disabled={element.disabled || !onAction ||
              rawOptionValue(option) === undefined || option.disabled}
            key={index}
            onClick={(event) => {
              event.stopPropagation();
              const run = () => {
                const optionBehaviors = [
                  ...(element.behaviors ?? []),
                  ...(option.behaviors ?? []),
                  ...(option.multi_url ? [{ type: "open_url",
                    pc_url: option.multi_url.pc_url,
                    default_url: option.multi_url.url ??
                      option.multi_url.default_url }] : []),
                ];
                const actions = actionsFor({ ...element, value: option.value,
                  behaviors: optionBehaviors }, path);
                if (actions.length) {
                  actions.forEach((action) => onAction?.(action));
                } else {
                  onAction?.({
                    type: "callback",
                    source: sourceFor(element, path),
                    value: serializableValue(option.value),
                  });
                }
              };
              if (element.confirm) setPendingAction(() => run);
              else run();
            }}
          >
            {optionText(option)}
          </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
    {tips.nodes}{element.confirm && <ConfirmDialog open={pendingAction !== null}
      title={element.confirm.title}
      text={element.confirm.text} trigger={trigger}
      onCancel={() => setPendingAction(null)}
      onConfirm={() => {
        const run = pendingAction;
        setPendingAction(null);
        run?.();
      }} />}
  </div>;
}
