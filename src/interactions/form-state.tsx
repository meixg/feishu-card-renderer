import { useCallback, useMemo, useRef, useState } from "react";

import type { FormScope } from "../renderer/context";

export function useFormScope(name: string, path: string): FormScope {
  const initialValues = useRef<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>({});

  const registerInitialValue = useCallback((
    fieldName: string,
    value: unknown,
  ) => {
    if (Object.hasOwn(initialValues.current, fieldName)) return;
    initialValues.current[fieldName] = value;
    setValues((current) => Object.hasOwn(current, fieldName)
      ? current
      : { ...current, [fieldName]: value });
  }, []);

  const setValue = useCallback((fieldName: string, value: unknown) => {
    setValues((current) => ({ ...current, [fieldName]: value }));
  }, []);

  return useMemo(() => ({
    name,
    path,
    values,
    registerInitialValue,
    setValue,
  }), [name, path, values, registerInitialValue, setValue]);
}
