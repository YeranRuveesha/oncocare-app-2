"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface Section {
  id: string;
  title: string;
  fields: string[];
  content: React.ReactNode;
}

/**
 * Step-by-step form. `canLeave(fields)` validates the current step with the
 * shared schema; the last step calls onSubmit.
 */
export default function Wizard({
  sections, canLeave, onSubmit, submitLabel, busy, error,
}: {
  sections: Section[];
  canLeave: (fields: string[]) => boolean;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  error?: string;
}) {
  const [step, setStep] = useState(0);
  const last = step === sections.length - 1;
  const current = sections[step];

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {sections.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 text-xs font-medium">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border text-[11px]",
                i < step && "border-brand bg-brand text-brand-foreground",
                i === step && "border-primary bg-primary text-primary-foreground",
                i > step && "bg-white text-muted-foreground",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("hidden sm:inline", i === step ? "text-ink" : "text-muted-foreground")}>{s.title}</span>
            {i < sections.length - 1 && <span className="hidden h-px w-4 bg-border sm:block" />}
          </li>
        ))}
      </ol>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-ink">
          Step {step + 1} of {sections.length}: {current.title}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">{current.content}</div>
      </div>

      {error && <FormAlert>{error}</FormAlert>}

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || busy}>
          <ArrowLeft /> Back
        </Button>
        {last ? (
          <Button
            type="button"
            variant="brand"
            size="lg"
            disabled={busy}
            onClick={() => {
              if (canLeave(current.fields)) onSubmit();
            }}
          >
            {busy && <Loader2 className="animate-spin" />} {submitLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={() => {
              if (canLeave(current.fields)) setStep((s) => s + 1);
            }}
          >
            Next <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
