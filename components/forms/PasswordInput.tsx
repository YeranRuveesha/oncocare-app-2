"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { passwordChecks } from "@/lib/validation/common";
import { cn } from "@/lib/utils";

export function PasswordInput({
  id, value, onChange, invalid, autoComplete = "new-password", placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-3 pr-11 font-mono text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive md:text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-ink"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Live checklist of the 16-character password rules. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Password rules">
      {passwordChecks(value).map((c) => (
        <li key={c.label} className={cn("flex items-center gap-1.5", c.ok ? "text-emerald-700" : "text-muted-foreground")}>
          {c.ok ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
          {c.label}
        </li>
      ))}
    </ul>
  );
}
