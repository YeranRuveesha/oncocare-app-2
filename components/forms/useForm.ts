"use client";

import { useCallback, useState } from "react";
import type { ZodTypeAny } from "zod";
import { fieldErrors } from "@/lib/validation/common";

export type Values = Record<string, unknown>;

/** Tiny form state helper: values + per-field errors + shared-schema validation. */
export function useForm<T extends Values>(initial: T) {
  const [v, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /** Validate with the SAME Zod schema the server uses. Only show errors for `only` fields if given. */
  const validate = useCallback(
    (schema: ZodTypeAny, only?: string[]) => {
      const parsed = schema.safeParse(v);
      if (parsed.success) {
        if (only) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !only.includes(k))));
        else setErrors({});
        return true;
      }
      const all = fieldErrors(parsed.error);
      const shown = only ? Object.fromEntries(Object.entries(all).filter(([k]) => only.includes(k.split(".")[0]))) : all;
      setErrors((prev) => {
        const kept = only ? Object.fromEntries(Object.entries(prev).filter(([k]) => !only.includes(k))) : {};
        return { ...kept, ...shown };
      });
      return Object.keys(shown).length === 0;
    },
    [v],
  );

  return { v, set, errors, setErrors, validate, setValues };
}
