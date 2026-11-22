"use client";

import { useEffect, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import OtpInput from "@/components/forms/OtpInput";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";

/** Authenticator app step: unique Supabase TOTP QR code, then the 6-digit code. */
export default function TotpSetup({ onVerified }: { onVerified: (data: Record<string, unknown>) => void }) {
  const [factor, setFactor] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const enroll = async () => {
    setError(undefined);
    const res = await api<{ factorId: string; qr: string; secret: string }>("/api/onboarding/totp/enroll");
    if (!res.ok) setError(res.error);
    else setFactor(res.data);
  };

  useEffect(() => {
    void enroll();
  }, []);

  const verify = async (value = code) => {
    if (!factor || !/^\d{6}$/.test(value)) return;
    setBusy(true);
    setError(undefined);
    const res = await api("/api/onboarding/totp/verify", { factorId: factor.factorId, code: value });
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
        <h2 className="font-display text-lg font-bold text-ink">Set up your authenticator app</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open Google Authenticator, Microsoft Authenticator or Authy, tap <b>+</b> and scan this QR code. You will need a code from it every time you log in.
        </p>
      </div>
      {!factor && !error && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Making your QR code…
        </p>
      )}
      {factor && (
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          {/* Supabase returns the QR code as an SVG image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={factor.qr} alt="QR code for your authenticator app" className="size-48 rounded-lg border bg-white p-2" />
          <div className="text-sm">
            <p className="flex items-center gap-2 font-medium text-ink">
              <Smartphone className="size-4" /> Can&apos;t scan?
            </p>
            <p className="mt-1 text-muted-foreground">Type this key into the app instead:</p>
            <code className="mt-2 block break-all rounded bg-muted px-2 py-1 font-mono text-xs">{factor.secret}</code>
          </div>
        </div>
      )}
      {factor && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="text-sm font-medium">Enter the 6-digit code shown in the app</p>
          <OtpInput id="totp" value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} invalid={Boolean(error)} />
          <div>
            <Button type="submit" variant="brand" disabled={busy || code.length !== 6}>
              {busy && <Loader2 className="animate-spin" />} Verify and finish
            </Button>
          </div>
        </form>
      )}
      {error && (
        <FormAlert>
          {error}{" "}
          {!factor && (
            <button type="button" className="underline" onClick={() => void enroll()}>
              Try again
            </button>
          )}
        </FormAlert>
      )}
    </div>
  );
}
