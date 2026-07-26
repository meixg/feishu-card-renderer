import { useEffect, useRef, useState } from "react";
import type {
  ButtonElement, CheckerElement, DatePickerElement, DateTimePickerElement,
  InputElement, MultiSelectPersonElement, MultiSelectStaticElement,
  OverflowElement, SelectImageElement, SelectOption, SelectPersonElement,
  SelectStaticElement, TimePickerElement,
} from "../../schema/components";
import { useRecursiveContext, useRendererContext } from "../../renderer/context";
import {
  actionsFor, browserTimezone, serializableValue, sourceFor,
} from "../../interactions/behaviors";
import { ConfirmDialog } from "../primitives/ConfirmDialog";

type InteractiveElement = InputElement | SelectStaticElement |
  MultiSelectStaticElement | SelectPersonElement | MultiSelectPersonElement |
  DatePickerElement | TimePickerElement | DateTimePickerElement |
  SelectImageElement | CheckerElement;

const empty = (value: unknown) => value === "" || value == null ||
  (Array.isArray(value) && value.length === 0);
const optionText = (option: SelectOption) => option.text?.content ??
  (typeof option.value === "string" ? option.value : "");

function useField(element: InteractiveElement, initial: unknown,
  dispatchWithoutBehavior = true, allowLocalWithoutAction = false) {
  const { form } = useRecursiveContext();
  const { onAction } = useRendererContext();
  const name = element.name;
  const [local, setLocal] = useState(initial);
  const [pending, setPending] = useState<unknown>();
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!form || !name) return;
    form.registerInitialValue(name, initial);
    form.registerRequired(name, element.required === true);
  }, [element.required, form, initial, name]);
  const value = form && name && Object.hasOwn(form.values, name)
    ? form.values[name] : local;
  const apply = (next: unknown, path: string, timezone = false) => {
    if (form && name) form.setValue(name, next);
    else {
      setLocal(next);
      actionsFor(element, path, {
        value: element.value ?? next,
        ...(timezone ? { timezone: browserTimezone() } : {}),
      }).forEach((action) => onAction?.(action));
      if (dispatchWithoutBehavior && actionsFor(element, path).length === 0) onAction?.({
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
    confirmDialog: confirming
      ? <ConfirmDialog title={element.confirm?.title} text={element.confirm?.text}
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
  const id = `fcr-${path.replace(/[^a-z0-9]/gi, "-")}`;
  const shared = { id, disabled: field.disabled, required: element.required,
    maxLength: element.max_length, value: String(field.value ?? ""),
    placeholder: element.placeholder?.content,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      field.set(event.target.value, path) };
  return <><label className="fcr-field" htmlFor={id}>
    {element.label?.content ?? element.name ?? "输入"}
    {element.input_type === "multiline_text"
      ? <textarea {...shared} rows={element.rows ?? 5} />
      : <input {...shared} type={element.input_type === "password" ? "password" : "text"} />}
  </label>{field.confirmDialog}</>;
}

type Single = SelectStaticElement | SelectPersonElement;
export function SingleSelect({ element, path }: { element: Single; path: string }) {
  const indexed = typeof element.initial_index === "number"
    ? element.options?.[element.initial_index]?.value : undefined;
  const initial = element.initial_option ?? (typeof indexed === "string" ? indexed : "");
  const field = useField(element, initial);
  return <><label className="fcr-field">{element.label?.content ??
    element.placeholder?.content ?? element.name ?? "选择"}
    <select aria-label={element.label?.content ?? element.placeholder?.content ??
      element.name ?? "选择"} value={String(field.value ?? "")}
      disabled={field.disabled} required={element.required}
      onChange={(event) => field.set(event.target.value, path)}>
      <option value="">{element.placeholder?.content ?? "请选择"}</option>
      {(element.options ?? []).map((option, index) =>
        <option key={`${option.value ?? index}`} value={String(option.value ?? "")}
          disabled={option.disabled}>{optionText(option)}</option>)}
    </select>
  </label>{field.confirmDialog}</>;
}

type Multi = MultiSelectStaticElement | MultiSelectPersonElement;
export function MultiSelect({ element, path }: { element: Multi; path: string }) {
  const field = useField(element, element.selected_values ?? []);
  return <><label className="fcr-field">{element.label?.content ?? element.name ?? "多选"}
    <select multiple aria-label={element.label?.content ?? element.name ?? "多选"}
      value={Array.isArray(field.value) ? field.value.map(String) : []}
      disabled={field.disabled} required={element.required}
      onChange={(event) => field.set([...event.target.selectedOptions].map(({ value }) => value), path)}>
      {(element.options ?? []).map((option, index) =>
        <option key={`${option.value ?? index}`} value={String(option.value ?? "")}
          disabled={option.disabled}>{optionText(option)}</option>)}
    </select>
  </label>{field.confirmDialog}</>;
}

type Picker = DatePickerElement | TimePickerElement | DateTimePickerElement;
export function Picker({ element, path }: { element: Picker; path: string }) {
  const tag = element.tag;
  const initial = tag === "date_picker" ? element.initial_date :
    tag === "picker_time" ? element.initial_time :
    element.initial_datetime?.replace(" ", "T");
  const field = useField(element, initial ?? "");
  const type = tag === "date_picker" ? "date" : tag === "picker_time" ? "time" :
    "datetime-local";
  return <><label className="fcr-field">{element.label?.content ?? element.name ?? "日期时间"}
    <input aria-label={element.label?.content ?? element.name ?? "日期时间"}
      type={type} value={String(field.value ?? "")} disabled={field.disabled}
      required={element.required}
      onChange={(event) => field.set(event.target.value, path, true)} />
  </label>{field.confirmDialog}</>;
}

export function Checker({ element, path }: { element: CheckerElement; path: string }) {
  const field = useField(element, element.checked ?? false, false, true);
  return <><label className="fcr-checker"><input type="checkbox"
    checked={Boolean(field.value)} disabled={field.disabled}
    required={element.required}
    onChange={(event) => field.set(event.target.checked, path)} />
    {element.text?.content ?? element.label?.content ?? element.name ?? "确认"}</label>
    {field.confirmDialog}</>;
}

export function SelectImage({ element, path }: { element: SelectImageElement; path: string }) {
  const initial = element.multi_select ? element.selected_values ?? [] :
    element.selected_values?.[0] ?? "";
  const field = useField(element, initial);
  return <><fieldset className="fcr-select-image" disabled={field.disabled}>
    <legend>{element.label?.content ?? element.name ?? "选择图片"}</legend>
    {(element.options ?? []).map((option, index) => {
      const value = String(option.value ?? index);
      const checked = element.multi_select ? Array.isArray(field.value) &&
        field.value.includes(value) : field.value === value;
      return <label key={value}><input type={element.multi_select ? "checkbox" : "radio"}
        name={element.name} checked={checked} onChange={() => {
          const next = element.multi_select
            ? checked ? (field.value as string[]).filter((item) => item !== value)
              : [...(field.value as string[]), value]
            : value;
          field.set(next, path);
        }} />{optionText(option)}</label>;
    })}
  </fieldset>{field.confirmDialog}</>;
}

export function Button({ element, path }: { element: ButtonElement; path: string }) {
  const { form } = useRecursiveContext();
  const { onAction } = useRendererContext();
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const business = element.form_action_type !== "reset";
  const run = () => {
    if (element.form_action_type === "reset") { form?.reset(); setError(false); return; }
    if (form && [...form.required].some((name) => empty(form.values[name]))) {
      setError(true); return;
    }
    const extra = form
      ? { formValue: { ...form.values }, timezone: browserTimezone() }
      : {};
    const actions = actionsFor(element, path, extra);
    const dispatch = form
      ? [...actions.filter(({ type }) => type === "callback").slice(0, 1),
          ...actions.filter(({ type }) => type === "open_url")]
      : actions;
    if (dispatch.length) dispatch.forEach((action) => onAction?.(action));
    else onAction?.({ type: "callback", source: sourceFor(element, path),
      ...(element.value !== undefined
        ? { value: serializableValue(element.value) } : {}), ...extra });
  };
  const activate = () => {
    if (form && element.form_action_type === "submit" &&
      [...form.required].some((name) => empty(form.values[name]))) {
      setError(true);
      return;
    }
    if (element.confirm) setConfirm(true);
    else run();
  };
  return <><button ref={trigger} type={element.form_action_type === "submit" ? "submit" : "button"}
    className="fcr-button" disabled={element.disabled || (business && !onAction)}
    onClick={(event) => { event.stopPropagation(); event.preventDefault(); activate(); }}>
    {element.text?.content ?? "按钮"}</button>
    {error && <span role="alert">有必填项未填写</span>}
    {confirm && <ConfirmDialog title={element.confirm?.title} text={element.confirm?.text}
      trigger={trigger} onCancel={() => setConfirm(false)}
      onConfirm={() => { setConfirm(false); run(); }} />}
  </>;
}

export function Overflow({ element, path }: { element: OverflowElement; path: string }) {
  const { onAction } = useRendererContext();
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) menu.current?.focus();
  }, [open]);
  const close = () => {
    setOpen(false);
    queueMicrotask(() => trigger.current?.focus());
  };
  return <div className="fcr-overflow"><button ref={trigger} type="button"
    aria-label="更多操作" disabled={element.disabled}
    aria-expanded={open} onClick={(event) => {
      event.stopPropagation(); setOpen(!open);
    }}>⋯</button>
    {open && <div ref={menu} role="menu" tabIndex={-1}
      aria-label="更多操作"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); close(); }
      }}>{(element.options ?? []).map((option, index) =>
      <button role="menuitem" type="button" disabled={element.disabled || !onAction}
        key={`${option.value ?? index}`} onClick={(event) => {
          event.stopPropagation();
          const run = () => {
            const optionBehaviors = [
              ...(element.behaviors ?? []),
              ...(option.behaviors ?? []),
              ...(option.multi_url ? [{ type: "open_url",
                pc_url: option.multi_url.pc_url,
                default_url: option.multi_url.url ?? option.multi_url.default_url }] : []),
            ];
            const actions = actionsFor({ ...element, value: option.value,
              behaviors: optionBehaviors }, path);
            if (actions.length) actions.forEach((action) => onAction?.(action));
            else onAction?.({ type: "callback", source: sourceFor(element, path),
              value: serializableValue(option.value) });
            close();
          };
          if (element.confirm) setPendingAction(() => run);
          else run();
        }}>{optionText(option)}</button>)}</div>}
    {pendingAction && <ConfirmDialog title={element.confirm?.title}
      text={element.confirm?.text} trigger={trigger}
      onCancel={() => setPendingAction(null)}
      onConfirm={() => { const run = pendingAction; setPendingAction(null); run(); }} />}
  </div>;
}
