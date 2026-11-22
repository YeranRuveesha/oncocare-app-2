"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client";

export default function ActivateForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!identifier || !password) return setError("Please fill in both fields.");
        setBusy(true);
        setError(undefined);
        const res = await api<{ next: string }>("/api/auth/activate", { identifier, password });
        setBusy(false);
        if (!res.ok) return setError(res.error);
        router.push(res.data.next);
        router.refresh();
      }}
    >
      <Field id="identifier" label="User ID or email" required hint="e.g. ADM-48271936 or SUP-12345678">
        <Input id="identifier" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </Field>
      <Field id="password" label="Temporary password" required hint="From your email or from the Admin. It works once and expires after 48 hours.">
        <PasswordInput id="password" autoComplete="one-time-code" value={password} onChange={setPassword} />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Start activation
      </Button>
    </form>
  );
}
