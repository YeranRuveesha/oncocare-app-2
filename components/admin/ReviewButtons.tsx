"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";

/** Approve / Reject with a required written reason for rejections. Used for change requests and pending clinicians. */
export default function ReviewButtons({ url, approveLabel = "Approve" }: { url: string; approveLabel?: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const send = async (decision: "approve" | "reject") => {
    setBusy(true);
    setError(undefined);
    const res = await api(url, { decision, reason: reason || undefined });
    setBusy(false);
    if (!res.ok) return setError(res.errors?.reason || res.error);
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-2">
      {rejecting ? (
        <>
          <Textarea aria-label="Reason for rejecting (the person will see this)" placeholder="Reason the person will see" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => void send("reject")}>
              {busy ? <Loader2 className="animate-spin" /> : <X />} Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="brand" disabled={busy} onClick={() => void send("approve")}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />} {approveLabel}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>Reject…</Button>
        </div>
      )}
      {error && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
