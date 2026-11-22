"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { QUALIFICATIONS } from "@/lib/options";

/** Tick any listed qualifications and ADD MORE of your own with "Other". */
export default function Qualifications({
  value, onChange, error, disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const custom = value.filter((q) => !(QUALIFICATIONS as readonly string[]).includes(q));
  const [otherOpen, setOtherOpen] = useState(custom.length > 0);
  const [draft, setDraft] = useState("");
  const toggle = (q: string) => onChange(value.includes(q) ? value.filter((x) => x !== q) : [...value, q]);
  const add = () => {
    const q = draft.trim();
    if (q.length >= 2 && !value.includes(q)) onChange([...value, q]);
    setDraft("");
  };

  return (
    <Field id="qualifications" label="Highest education / qualifications" required error={error} hint="Tick all that apply. Use Other to add more.">
      <div className="flex flex-wrap gap-2" id="qualifications">
        {QUALIFICATIONS.map((q) => (
          <label key={q} className="flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-teal-soft">
            <input type="checkbox" className="accent-[var(--brand-accent)]" checked={value.includes(q)} disabled={disabled} onChange={() => toggle(q)} />
            {q}
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-teal-soft">
          <input type="checkbox" className="accent-[var(--brand-accent)]" checked={otherOpen} disabled={disabled} onChange={() => setOtherOpen((o) => !o)} />
          Other
        </label>
      </div>
      {otherOpen && (
        <div className="mt-2 flex gap-2">
          <Input
            aria-label="Other qualification"
            placeholder="e.g. MRCPath, DCH"
            value={draft}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={add} disabled={disabled}>
            <Plus /> Add more
          </Button>
        </div>
      )}
      {custom.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {custom.map((q) => (
            <span key={q} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {q}
              <button type="button" aria-label={`Remove ${q}`} onClick={() => toggle(q)} disabled={disabled}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}
