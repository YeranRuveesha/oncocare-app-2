"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ColorField({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field id={id} label={label} required error={error}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-10 w-14 cursor-pointer rounded border bg-white p-1" />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} className="font-mono uppercase" />
      </div>
    </Field>
  );
}
