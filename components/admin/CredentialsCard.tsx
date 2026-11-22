"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shows a User ID + temporary password ONCE, with Copy buttons. */
export default function CredentialsCard({ userCode, tempPassword, email }: { userCode: string; tempPassword: string; email?: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5">
      <p className="flex items-center gap-2 font-semibold text-amber-900">
        <AlertTriangle className="size-5" /> This password will not be shown again.
      </p>
      <dl className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-center">
        <dt className="text-sm text-muted-foreground">User ID</dt>
        <dd className="font-mono text-lg font-bold">{userCode}</dd>
        <Button size="sm" variant="outline" onClick={() => void copy("id", userCode)}>{copied === "id" ? <Check /> : <Copy />} Copy</Button>
        <dt className="text-sm text-muted-foreground">Temporary password</dt>
        <dd className="break-all font-mono text-lg font-bold">{tempPassword}</dd>
        <Button size="sm" variant="outline" onClick={() => void copy("pw", tempPassword)}>{copied === "pw" ? <Check /> : <Copy />} Copy</Button>
      </dl>
      <p className="text-sm text-emerald-900">
        {email ? <>We also emailed these to <b>{email}</b> (Mailpit locally). </> : null}
        It expires in 48 hours and works once at <b>/activate</b>.
      </p>
    </div>
  );
}
