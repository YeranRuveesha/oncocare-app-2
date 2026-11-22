"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client";

export default function ForgotForm({ linkError }: { linkError?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>(linkError ? "That reset link is invalid or has expired. Ask for a new one below." : "");
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await api<{ message: string }>("/api/auth/forgot", { email });
        setBusy(false);
        if (!res.ok) return setError(res.errors?.email || res.error || "");
        setMessage(res.data.message);
      }}
    >
      <Field id="email" label="Email address" required>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      {message && <FormAlert kind="success">{message}</FormAlert>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Mail />} Send reset instructions
      </Button>
      <p className="text-xs text-muted-foreground">Running locally? The email appears in Mailpit: http://localhost:54324</p>
    </form>
  );
}
