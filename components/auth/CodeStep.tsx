"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import OtpInput from "@/components/forms/OtpInput";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";

/**
 * Reusable "we sent you a 6-digit code" step for EMAIL OTP and PHONE OTP.
 * sendUrl sends (or re-sends) the code, verifyUrl checks it.
 */
export default function CodeStep({
  title, description, sendUrl, verifyUrl, onVerified, autoSend = true, extraBody, help,
}: {
  title: string;
  description: React.ReactNode;
  sendUrl: string;
  verifyUrl: string;
  onVerified: (data: Record<string, unknown>) => void;
  autoSend?: boolean;
  extraBody?: Record<string, unknown>;
  help?: React.ReactNode;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [cooldown, setCooldown] = useState(0);

  const send = async () => {
    setSending(true);
    setError(undefined);
    const res = await api(sendUrl, extraBody ?? {});
    setSending(false);
    if (!res.ok) setError(res.error);
    else {
      setInfo("Code sent.");
      setCooldown(30);
    }
  };

  useEffect(() => {
    if (autoSend) void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    setError(undefined);
    const res = await api(verifyUrl, { ...(extraBody ?? {}), code: value });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setCode("");
      return;
    }
    onVerified(res.data);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {help}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <OtpInput id="otp" value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} invalid={Boolean(error)} />
        {error && <FormAlert>{error}</FormAlert>}
        {info && !error && <p className="text-xs text-emerald-700" role="status">{info}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="brand" disabled={busy || code.length !== 6}>
            {busy && <Loader2 className="animate-spin" />} Verify
          </Button>
          <Button type="button" variant="ghost" onClick={() => void send()} disabled={sending || cooldown > 0}>
            {sending ? <Loader2 className="animate-spin" /> : <RotateCw />}
            {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
          </Button>
        </div>
      </form>
    </div>
  );
}
