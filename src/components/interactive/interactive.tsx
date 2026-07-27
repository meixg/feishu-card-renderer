import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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

function useTips(element: {
  disabled?: boolean;
  hover_tips?: { content?: string };
  disabled_tips?: { content?: string };
}) {
  const id = useId().replace(/[^A-Za-z0-9_-]/g, "");
  const tips = [
    element.hover_tips?.content,
    element.disabled ? element.disabled_tips?.content : undefined,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  const describedBy = tips.length > 0 ? `fcr-tips-${id}` : undefined;
  return {
    describedBy,
    nodes: tips.length > 0
      ? <span id={describedBy} className="fcr-field-tips">
          {tips.map((tip, index) => <span key={index}>{tip}</span>)}
        </span>
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
  return { value, set, disabled: element.disabled === true ||
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
  const tips = useTips(element);
  const id = `fcr-${path.replace(/[^a-z0-9]/gi, "-")}`;
  const shared = { id, disabled: field.disabled, required: element.required,
    "aria-describedby": tips.describedBy,
    maxLength: element.max_length, value: String(field.value ?? ""),
    placeholder: element.placeholder?.content,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      field.set(event.target.value, path) };
  return <><label className="fcr-field" htmlFor={id}>
    {element.label?.content ?? element.name ?? "输入"}
    {element.input_type === "multiline_text"
      ? <textarea {...shared} rows={element.rows ?? 5} />
      : <input {...shared} type={element.input_type === "password" ? "password" : "text"} />}
  </label>{tips.nodes}{field.confirmDialog}</>;
}

type Single = SelectStaticElement | SelectPersonElement;

function PersonNameProbe({ id, token, onName }: {
  id: string;
  token: string;
  onName: (token: string, name: string | undefined) => void;
}) {
  const resource = usePersonResource(id);
  const name = resource?.status === "ready" ? resource.value?.name : undefined;
  useEffect(() => onName(token, name), [name, onName, token]);
  return null;
}

function useChoiceOptions(
  element: Single | Multi,
  path: string,
): {
  choices: readonly ChoiceOption[];
  probes: React.ReactNode;
} {
  const [personNames, setPersonNames] = useState<Record<string, string>>({});
  const isPerson = element.tag === "select_person" ||
    element.tag === "multi_select_person";
  const onName = useCallback((token: string, name: string | undefined) => {
    setPersonNames((current) => {
      if (current[token] === name || (!name && !(token in current))) return current;
      const next = { ...current };
      if (name) next[token] = name;
      else delete next[token];
      return next;
    });
  }, []);
  const choices = useMemo(() => (element.options ?? []).map((option, index) => {
    const token = optionToken(path, index);
    const raw = rawOptionValue(option);
    const supplied = optionText(option);
    const resolved = personNames[token];
    const label = option.text?.content ?? resolved ?? (supplied || "未命名选项");
    return {
      token,
      label,
      searchText: [label, supplied, resolved].filter(Boolean).join(" "),
      disabled: option.disabled === true || raw === undefined,
    };
  }), [element.options, path, personNames]);
  const probes = isPerson
    ? (element.options ?? []).map((option, index) => {
        const value = rawOptionValue(option);
        return typeof value === "string"
          ? <PersonNameProbe
              id={value}
              key={optionToken(path, index)}
              onName={onName}
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
  const tips = useTips(element);
  const { device, locale } = useRendererContext();
  const { choices, probes } = useChoiceOptions(element, path);
  const selectedIndex = (element.options ?? []).findIndex((option) =>
    sameOptionValue(rawOptionValue(option), field.value));
  const label = element.label?.content ?? element.placeholder?.content ??
    element.name ?? "选择";
  return <><div className="fcr-field">
    <span>{label}</span>
    <ChoiceField
      describedBy={tips.describedBy}
      disabled={field.disabled}
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
      searchable={element.tag === "select_person" || choices.length >= 8}
      value={selectedIndex < 0 ? "" : optionToken(path, selectedIndex)}
    />
  </div>{probes}{tips.nodes}{field.confirmDialog}</>;
}

type Multi = MultiSelectStaticElement | MultiSelectPersonElement;
export function MultiSelect({ element, path }: { element: Multi; path: string }) {
  const field = useField(element, element.selected_values ?? []);
  const tips = useTips(element);
  const { device, locale } = useRendererContext();
  const { choices, probes } = useChoiceOptions(element, path);
  const selectedTokens = (element.options ?? []).flatMap((option, index) => {
    const value = rawOptionValue(option);
    return value !== undefined && includesOption(field.value, value)
      ? [optionToken(path, index)] : [];
  });
  const label = element.label?.content ?? element.name ?? "多选";
  return <><div className="fcr-field">
    <span>{label}</span>
    <ChoiceField
      describedBy={tips.describedBy}
      disabled={field.disabled}
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
  </div>{probes}{tips.nodes}{field.confirmDialog}</>;
}

type Picker = DatePickerElement | TimePickerElement | DateTimePickerElement;
export function Picker({ element, path }: { element: Picker; path: string }) {
  const tag = element.tag;
  const initial = tag === "date_picker" ? element.initial_date :
    tag === "picker_time" ? element.initial_time :
    element.initial_datetime?.replace(" ", "T");
  const field = useField(element, initial ?? "");
  const tips = useTips(element);
  const type = tag === "date_picker" ? "date" : tag === "picker_time" ? "time" :
    "datetime-local";
  return <><label className="fcr-field">{element.label?.content ?? element.name ?? "日期时间"}
    <input aria-label={element.label?.content ?? element.name ?? "日期时间"}
      type={type} value={String(field.value ?? "")} disabled={field.disabled}
      aria-describedby={tips.describedBy}
      required={element.required}
      onChange={(event) => field.set(event.target.value, path, true)} />
  </label>{tips.nodes}{field.confirmDialog}</>;
}

export function Checker({ element, path }: { element: CheckerElement; path: string }) {
  const field = useField(element, element.checked ?? false, false, true,
    checkerMissing);
  const tips = useTips(element);
  return <><label className="fcr-checker"><input type="checkbox"
    checked={Boolean(field.value)} disabled={field.disabled}
    aria-describedby={tips.describedBy}
    required={element.required}
    onChange={(event) => field.set(event.target.checked, path)} />
    {element.text?.content ?? element.label?.content ?? element.name ?? "确认"}</label>
    {tips.nodes}{field.confirmDialog}</>;
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
  const tips = useTips(element);
  return <><fieldset className="fcr-select-image" disabled={field.disabled}
    aria-describedby={tips.describedBy}>
    <legend>{element.label?.content ?? element.name ?? "选择图片"}</legend>
    {(element.options ?? []).map((option, index) => {
      const value = rawOptionValue(option);
      const token = optionToken(path, index);
      const checked = element.multi_select ? Array.isArray(field.value) &&
        value !== undefined && includesOption(field.value, value) :
        value !== undefined && sameOptionValue(field.value, value);
      return <label key={token}><input type={element.multi_select ? "checkbox" : "radio"}
        name={`fcr-choice-${path}`} checked={checked}
        disabled={value === undefined || option.disabled} onChange={() => {
          if (value === undefined) return;
          const next = element.multi_select
            ? checked ? (field.value as OptionValue[])
                .filter((item) => !sameOptionValue(item, value))
              : [...(field.value as OptionValue[]), value]
            : value;
          field.set(next, path);
        }} /><SelectImageVisual option={option} />{optionText(option)}</label>;
    })}
  </fieldset>{tips.nodes}{field.confirmDialog}</>;
}

export function Button({ element, path }: { element: ButtonElement; path: string }) {
  const { form } = useRecursiveContext();
  const { onAction } = useRendererContext();
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const tips = useTips(element);
  const trigger = useRef<HTMLButtonElement>(null);
  const business = element.form_action_type !== "reset";
  const run = () => {
    if (element.form_action_type === "reset") { form?.reset(); setError(false); return; }
    if (form?.hasMissingRequired()) {
      setError(true); return;
    }
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
    if (form && element.form_action_type === "submit" &&
      form.hasMissingRequired()) {
      setError(true);
      return;
    }
    if (element.confirm) setConfirm(true);
    else run();
  };
  return <><button ref={trigger} type={element.form_action_type === "submit" ? "submit" : "button"}
    className="fcr-button" disabled={element.disabled || (business && !onAction)}
    aria-describedby={tips.describedBy}
    onKeyDown={(event) => event.stopPropagation()}
    onClick={(event) => { event.stopPropagation(); event.preventDefault(); activate(); }}>
    {element.text?.content ?? "按钮"}</button>
    {tips.nodes}{error && <span role="alert">有必填项未填写</span>}
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
  const tips = useTips(element);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="fcr-overflow">
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      disabled={element.disabled}
    >
      <DropdownMenuTrigger
        ref={trigger}
        aria-label="更多操作"
        disabled={element.disabled}
        aria-describedby={tips.describedBy}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        ⋯
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
