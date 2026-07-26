import { useCallback, useMemo, useRef, useState } from "react";

import type { FormScope } from "../renderer/context";

export function useFormScope(name: string, path: string): FormScope {
  const initialValues = useRef<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});
  const requiredValues = useRef(new Set<string>());

  const registerInitialValue = useCallback((
    fieldName: string,
    value: unknown,
  ) => {
    initialValues.current[fieldName] = value;
    setValues((current) => Object.hasOwn(current, fieldName)
      ? current
      : { ...current, [fieldName]: value });
  }, []);

  const setValue = useCallback((fieldName: string, value: unknown) => {
    setValues((current) => ({ ...current, [fieldName]: value }));
  }, []);
  const reset = useCallback(() => setValues({ ...initialValues.current }), []);
  const registerRequired = useCallback((fieldName: string, required: boolean) => {
    if (required) requiredValues.current.add(fieldName);
    else requiredValues.current.delete(fieldName);
  }, []);

  return useMemo(() => ({
    name,
    path,
    values,
    registerInitialValue,
    setValue,
    reset,
    required: requiredValues.current,
    registerRequired,
  }), [name, path, values, registerInitialValue, setValue, reset,
    registerRequired]);
}
