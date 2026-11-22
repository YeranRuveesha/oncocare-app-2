"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { PasswordInput, PasswordRules } from "@/components/forms/PasswordInput";
import { useForm } from "@/components/forms/useForm";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";
import { newPasswordSchema } from "@/lib/validation/forms";

/** Choose a new permanent password (used for activation, invites and password reset). */
export default function SetPassword({
  url, title, description, onDone, askCurrent,
}: {
  url: string;
  title: string;
  description: React.ReactNode;
  onDone: (data: Record<string, unknown>) => void;
  askCurrent?: boolean;
}) {
  const { v, set, errors, setErrors, validate } = useForm({ password: "", confirm_password: "", current_password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setError(undefined);
        if (!validate(newPasswordSchema)) return;
        setBusy(true);
        const res = await api(url, v);
        setBusy(false);
        if (!res.ok) {
          if (res.errors) setErrors(res.errors);
          setError(res.error);
          return;
        }
        onDone(res.data);
      }}
    >
      <div>
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {askCurrent && (
        <Field id="current_password" label="Temporary password" required error={errors.current_password} hint="So we can check the new one is different.">
          <PasswordInput id="current_password" autoComplete="current-password" value={v.current_password} onChange={(x) => set("current_password", x)} />
        </Field>
      )}
      <Field id="password" label="New password" required error={errors.password}>
        <PasswordInput id="password" value={v.password} invalid={Boolean(errors.password)} onChange={(x) => set("password", x)} />
        <PasswordRules value={v.password} />
      </Field>
      <Field id="confirm_password" label="Confirm new password" required error={errors.confirm_password}>
        <PasswordInput id="confirm_password" value={v.confirm_password} invalid={Boolean(errors.confirm_password)} onChange={(x) => set("confirm_password", x)} />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <div>
        <Button type="submit" variant="brand" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} Save password
        </Button>
      </div>
    </form>
  );
}
