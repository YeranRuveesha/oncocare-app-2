"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { todayIso } from "@/lib/validation/common";
import PhoneInput from "./PhoneInput";

export interface FieldProps {
  name: string;
  label: string;
  v: Record<string, unknown>;
  set: (k: string, val: unknown) => void;
  errors: Record<string, string>;
  required?: boolean;
  hint?: React.ReactNode;
  disabled?: boolean;
}

const str = (x: unknown) => (x === undefined || x === null ? "" : String(x));

export function TextField({ name, label, v, set, errors, required, hint, disabled, type = "text", autoComplete, inputMode, maxLength }: FieldProps & { type?: string; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; maxLength?: number }) {
  return (
    <Field id={name} label={label} required={required} error={errors[name]} hint={hint}>
      <Input
        id={name}
        type={type}
        value={str(v[name])}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        onChange={(e) => set(name, e.target.value)}
      />
    </Field>
  );
}

export function SelectField({ name, label, v, set, errors, required, hint, disabled, options, placeholder = "Choose…" }: FieldProps & { options: readonly (string | { value: string; label: string })[]; placeholder?: string }) {
  return (
    <Field id={name} label={label} required={required} error={errors[name]} hint={hint}>
      <NativeSelect
        id={name}
        value={str(v[name])}
        disabled={disabled}
        aria-invalid={errors[name] ? true : undefined}
        onChange={(e) => set(name, e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </NativeSelect>
    </Field>
  );
}

/** Uses the browser's built-in calendar. Future dates are blocked. */
export function DateField({ name, label, v, set, errors, required, hint, disabled, min }: FieldProps & { min?: string }) {
  return (
    <Field id={name} label={label} required={required} error={errors[name]} hint={hint}>
      <Input
        id={name}
        type="date"
        max={todayIso()}
        min={min ?? "1900-01-01"}
        value={str(v[name])}
        disabled={disabled}
        aria-invalid={errors[name] ? true : undefined}
        onChange={(e) => set(name, e.target.value)}
      />
    </Field>
  );
}

export function PhoneField({ name, label, v, set, errors, required, hint, disabled }: FieldProps) {
  return (
    <Field id={name} label={label} required={required} error={errors[name]} hint={hint}>
      <PhoneInput id={name} value={str(v[name])} disabled={disabled} invalid={Boolean(errors[name])} onChange={(val) => set(name, val)} />
    </Field>
  );
}

export const TEST_PHONE_HINT = "Demo: choose Sri Lanka and use a test number 77 000 0001 to 77 000 0020 (code 123456).";
