import { useCallback, useMemo, useRef, useState } from "react";

import type { FormScope } from "../renderer/context";

export function useFormScope(name: string, path: string): FormScope {
  const initialValues = useRef<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [invalidFields, setInvalidFields] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const controls = useRef(new Map<string, HTMLElement>());
  const requirements = useRef(new Map<string, {
    token: symbol;
    fieldType: string;
    required: boolean;
    isMissing: (value: unknown) => boolean;
  }>());

  const registerField = useCallback((
    fieldName: string,
    fieldType: string,
    initialValue: unknown,
    isMissing: (value: unknown) => boolean,
  ) => {
    const token = Symbol(fieldName);
    initialValues.current[fieldName] = initialValue;
    requirements.current.set(fieldName, {
      token, fieldType, required: false, isMissing,
    });
    setValues((current) => Object.hasOwn(current, fieldName)
      ? current
      : { ...current, [fieldName]: initialValue });
    return () => {
      if (requirements.current.get(fieldName)?.token !== token) return;
      requirements.current.delete(fieldName);
      controls.current.delete(fieldName);
      delete initialValues.current[fieldName];
      setInvalidFields((current) => {
        if (!current.has(fieldName)) return current;
        const next = new Set(current);
        next.delete(fieldName);
        return next;
      });
      setValues((current) => {
        if (!Object.hasOwn(current, fieldName)) return current;
        const next = { ...current };
        delete next[fieldName];
        return next;
      });
    };
  }, []);
  const updateField = useCallback((
    fieldName: string,
    fieldType: string,
    initialValue: unknown,
    required: boolean,
    isMissing: (value: unknown) => boolean,
  ) => {
    const previous = requirements.current.get(fieldName);
    if (!previous) return;
    initialValues.current[fieldName] = initialValue;
    requirements.current.set(fieldName, {
      ...previous, fieldType, required, isMissing,
    });
    if (previous.fieldType !== fieldType) {
      setValues((current) => ({ ...current, [fieldName]: initialValue }));
      setInvalidFields((current) => {
        if (!current.has(fieldName)) return current;
        const next = new Set(current);
        next.delete(fieldName);
        return next;
      });
    }
  }, []);

  const setValue = useCallback((fieldName: string, value: unknown) => {
    setValues((current) => ({ ...current, [fieldName]: value }));
    const requirement = requirements.current.get(fieldName);
    if (requirement && !requirement.isMissing(value)) {
      setInvalidFields((current) => {
        if (!current.has(fieldName)) return current;
        const next = new Set(current);
        next.delete(fieldName);
        return next;
      });
    }
  }, []);
  const setFieldControl = useCallback((
    fieldName: string,
    control: HTMLElement | null,
  ) => {
    if (control) controls.current.set(fieldName, control);
    else controls.current.delete(fieldName);
  }, []);
  const reset = useCallback(() => {
    setValues({ ...initialValues.current });
    setInvalidFields(new Set());
  }, []);
  const hasMissingRequired = useCallback(() => {
    for (const [fieldName, requirement] of requirements.current) {
      if (requirement.required &&
        requirement.isMissing(valuesRef.current[fieldName])) return true;
    }
    return false;
  }, []);
  const validateRequired = useCallback(() => {
    const missing: string[] = [];
    for (const [fieldName, requirement] of requirements.current) {
      if (requirement.required &&
        requirement.isMissing(valuesRef.current[fieldName])) {
        missing.push(fieldName);
      }
    }
    setInvalidFields(new Set(missing));
    const first = missing[0] ? controls.current.get(missing[0]) : undefined;
    if (first) {
      first.focus({ preventScroll: true });
      first.scrollIntoView?.({ block: "center" });
    }
    return missing.length > 0;
  }, []);

  return useMemo(() => ({
    name,
    path,
    values,
    registerField,
    updateField,
    setValue,
    setFieldControl,
    invalidFields,
    reset,
    hasMissingRequired,
    validateRequired,
  }), [name, path, values, registerField, updateField, setValue, reset,
    setFieldControl, invalidFields, hasMissingRequired, validateRequired]);
}
