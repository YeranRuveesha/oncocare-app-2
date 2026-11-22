"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";

/**
 * A button that opens a confirmation box: written reason (always) and,
 * for dangerous actions, typing a name to confirm.
 */
export default function ConfirmAction({
  url, body, label, title, description, variant = "outline", confirmText, danger, onDone, needReason = true,
}: {
  url: string;
  body: Record<string, unknown>;
  label: string;
  title: string;
  description?: React.ReactNode;
  variant?: "outline" | "destructive" | "brand" | "ghost" | "default";
  confirmText?: string; // e.g. the hospital name to type
  danger?: boolean;
  onDone?: (data: Record<string, unknown>) => void;
  needReason?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const ready = (!needReason || reason.trim().length >= 3) && (!confirmText || typed.trim() === confirmText);

  if (!open) {
    return (
      <Button type="button" size="sm" variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div role="dialog" aria-label={title} className={`flex w-full flex-col gap-3 rounded-xl border p-4 ${danger ? "border-red-200 bg-red-50" : "bg-ice"}`}>
      <p className="font-semibold">{title}</p>
      {description && <div className="text-sm text-muted-foreground">{description}</div>}
      {needReason && (
        <Field id={`reason-${label}`} label="Reason" required>
          <Textarea id={`reason-${label}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      )}
      {confirmText && (
        <Field id={`confirm-${label}`} label={<>Type <b>{confirmText}</b> to confirm</>} required>
          <Input id={`confirm-${label}`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </Field>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={danger ? "destructive" : "brand"}
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            setError(undefined);
            const res = await api(url, { ...body, reason: needReason ? reason : undefined, confirm_name: typed || undefined });
            setBusy(false);
            if (!res.ok) return setError(res.error);
            setOpen(false);
            setReason("");
            setTyped("");
            onDone?.(res.data);
            router.refresh();
          }}
        >
          {busy && <Loader2 className="animate-spin" />} Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
