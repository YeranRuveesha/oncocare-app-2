"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

interface Ex { id: string; name: string }
interface PlanItem { exercise_id: string; name: string; status: "allowed" | "restricted"; reason: string | null }

/** Only shown to the assigned clinician. Every change needs a reason and is kept in the record. */
export default function RehabEditor({ patientId, library, plan, paused, pauseReason, target }: { patientId: string; library: Ex[]; plan: PlanItem[]; paused: boolean; pauseReason: string | null; target: number }) {
  const router = useRouter();
  const [ex, setEx] = useState(library.find((l) => !plan.some((p) => p.exercise_id === l.id))?.id ?? library[0]?.id ?? "");
  const [status, setStatus] = useState<"allowed" | "restricted">("allowed");
  const [reason, setReason] = useState("");
  const [mins, setMins] = useState(String(target));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/rehab/${patientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, reason }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, t: (j.errors && Object.values(j.errors)[0]) || j.error || "Something went wrong." });
    setMsg({ ok: true, t: "Saved." }); setReason(""); router.refresh();
  }
  const noReason = reason.trim().length < 3;
  return (
    <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm print:hidden">
      <h3 className="font-display text-base font-bold">Change the exercise plan</h3>
      <div>
        <label htmlFor="rr" className="mb-1 block text-xs font-semibold">Reason for the change (required, kept in the record)</label>
        <Input id="rr" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. low platelets: avoid this exercise" maxLength={300} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <NativeSelect value={ex} onChange={(e) => setEx(e.target.value)} aria-label="Exercise">{library.map((l) => <option key={l.id} value={l.id}>{l.name}{plan.some((p) => p.exercise_id === l.id) ? " (in plan)" : ""}</option>)}</NativeSelect>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as "allowed" | "restricted")} aria-label="Status"><option value="allowed">Allowed</option><option value="restricted">Restricted</option></NativeSelect>
        <Button disabled={busy || noReason || !ex} onClick={() => send({ action: "set", exercise_id: ex, status })}>Add / update</Button>
      </div>
      {plan.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {plan.map((p) => (
            <li key={p.exercise_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>{p.name} · <b className={p.status === "restricted" ? "text-crimson" : "text-emerald-700"}>{p.status}</b>{p.reason ? <span className="text-xs text-muted-foreground"> ({p.reason})</span> : null}</span>
              <Button size="sm" variant="outline" disabled={busy || noReason} onClick={() => send({ action: "remove", exercise_id: p.exercise_id })}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3 border-t pt-3">
        <Button variant={paused ? "brand" : "outline"} disabled={busy || noReason} onClick={() => send({ action: paused ? "resume" : "pause" })}>{paused ? "Resume all exercises" : "Pause all exercises"}</Button>
        {paused && pauseReason && <span className="text-xs text-muted-foreground">Paused: {pauseReason}</span>}
        <div className="ml-auto flex items-end gap-2">
          <div><label htmlFor="wt" className="mb-1 block text-xs font-semibold">Walking goal (min/day)</label><Input id="wt" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value)} className="w-24" /></div>
          <Button variant="outline" disabled={busy || noReason} onClick={() => send({ action: "walking_target", minutes: Number(mins) })}>Set</Button>
        </div>
      </div>
      {msg && <p role="status" className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{msg.t}</p>}
    </div>
  );
}
