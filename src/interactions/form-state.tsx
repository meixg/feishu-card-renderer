import { useCallback, useMemo, useRef, useState } from "react";

import type { FormScope } from "../renderer/context";

export function useFormScope(name: string, path: string): FormScope {
  const initialValues = useRef<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const valuesRef = useRef(values);
  valuesRef.current = values;
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
      delete initialValues.current[fieldName];
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
    }
  }, []);

  const setValue = useCallback((fieldName: string, value: unknown) => {
    setValues((current) => ({ ...current, [fieldName]: value }));
  }, []);
  const reset = useCallback(() => setValues({ ...initialValues.current }), []);
  const hasMissingRequired = useCallback(() => {
    for (const [fieldName, requirement] of requirements.current) {
      if (requirement.required &&
        requirement.isMissing(valuesRef.current[fieldName])) return true;
    }
    return false;
  }, []);

  return useMemo(() => ({
    name,
    path,
    values,
    registerField,
    updateField,
    setValue,
    reset,
    hasMissingRequired,
  }), [name, path, values, registerField, updateField, setValue, reset,
    hasMissingRequired]);
}
