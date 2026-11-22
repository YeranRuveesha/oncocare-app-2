"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import OtpInput from "@/components/forms/OtpInput";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";

export default function MfaForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) return;
    setBusy(true);
    setError(undefined);
    const res = await api<{ next: string }>("/api/auth/mfa", { code: value });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setCode("");
      return;
    }
    router.push(res.data.next);
    router.refresh();
  };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
    >
      <OtpInput id="code" value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} invalid={Boolean(error)} />
      {error && <FormAlert>{error}</FormAlert>}
      <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
        {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Verify
      </Button>
    </form>
  );
}
