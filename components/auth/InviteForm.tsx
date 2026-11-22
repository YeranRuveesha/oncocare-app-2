"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import OtpInput from "@/components/forms/OtpInput";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client";

export default function InviteForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(undefined);
        const res = await api<{ next: string }>("/api/auth/invite", { email, code });
        setBusy(false);
        if (!res.ok) return setError(res.error);
        router.push(res.data.next);
        router.refresh();
      }}
    >
      <Field id="email" label="Email address" required>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field id="code" label="Invite code from the email" required>
        <OtpInput id="code" value={code} onChange={setCode} />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
        {busy && <Loader2 className="animate-spin" />} Continue
      </Button>
    </form>
  );
}
