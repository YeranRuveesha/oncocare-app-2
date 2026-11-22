"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, Check, Dumbbell, Footprints, Lock, Scale, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ExerciseView {
  id: string; name: string; category: string; description: string; duration: string | null; setsReps: string | null; precautions: string | null;
  status: "allowed" | "restricted"; reason: string | null; target: string | null; doneAt: string | null;
}
const ICON: Record<string, typeof Activity> = { walking: Footprints, stretching: Activity, breathing: Wind, "light strength": Dumbbell, balance: Scale };

/** One exercise of today's plan. Restricted or paused cards are greyed out and cannot be ticked. */
export default function ExerciseCard({ ex, pausedReason }: { ex: ExerciseView; pausedReason: string | null }) {
  const router = useRouter();
  const Icon = ICON[ex.category] ?? Activity;
  const locked = ex.status === "restricted" || Boolean(pausedReason);
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(String(parseInt(ex.duration ?? "") || 10));
  const [effort, setEffort] = useState(3);
  const [sym, setSym] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [stop, setStop] = useState(false);

  async function save() {
    setBusy(true); setErr("");
    const res = await fetch("/api/exercise-logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exercise_id: ex.id, minutes: Number(minutes), effort, symptoms: sym, symptom_note: sym ? note || null : null }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.errors ? Object.values(j.errors)[0] as string : j.error ?? "Something went wrong.");
    setOpen(false);
    if (j.symptoms) setStop(true); else router.refresh();
  }

  return (
    <article className={cn("rounded-xl border bg-white p-4 shadow-sm", locked && "bg-muted/60 opacity-70", ex.doneAt && "border-emerald-400")} aria-disabled={locked}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#1B7A7E]/10 text-[#1B7A7E]"><Icon className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold text-ink">{ex.name}</h3>
          <p className="text-sm text-slate-600">{ex.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">{[ex.target ?? ex.duration, ex.setsReps].filter(Boolean).join(" · ")}</p>
          {ex.precautions && <p className="mt-1 text-xs text-amber-800">Be careful: {ex.precautions}</p>}
        </div>
      </div>
      {locked && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-white p-2 text-sm text-slate-700"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {pausedReason ? `All exercises are paused: ${pausedReason}` : `Not allowed for now: ${ex.reason}`}</p>
      )}
      {!locked && ex.doneAt && <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="size-4" aria-hidden="true" /> Done today at {ex.doneAt}</p>}
      {!locked && !ex.doneAt && !open && <Button className="mt-3" variant="outline" onClick={() => setOpen(true)}>I did this exercise</Button>}
      {open && !locked && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold" htmlFor={`m-${ex.id}`}>Minutes</label><Input id={`m-${ex.id}`} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-11" /></div>
            <div><label className="mb-1 block text-xs font-semibold" htmlFor={`e-${ex.id}`}>How hard did it feel? {effort} / 10</label><input id={`e-${ex.id}`} type="range" min={0} max={10} value={effort} onChange={(e) => setEffort(Number(e.target.value))} className="h-11 w-full accent-[#1B7A7E]" /></div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold" id={`s-${ex.id}`}>Did you feel dizzy, short of breath, or in pain?</p>
            <div className="flex gap-2" role="radiogroup" aria-labelledby={`s-${ex.id}`}>
              {[true, false].map((b) => <button key={String(b)} type="button" role="radio" aria-checked={sym === b} onClick={() => setSym(b)} className={cn("h-11 flex-1 rounded-lg border text-sm font-medium", sym === b ? "border-primary bg-primary text-primary-foreground" : "bg-white")}>{b ? "Yes" : "No"}</button>)}
            </div>
            {sym && <Textarea className="mt-2" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you feel? (optional)" aria-label="What did you feel" />}
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <div className="flex gap-2"><Button variant="brand" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </div>
      )}
      {stop && (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-crimson bg-red-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-crimson"><AlertTriangle className="size-5" aria-hidden="true" /> Stop exercising and use Report Symptoms.</p>
          <Button asChild variant="brand"><Link href="/patient/report">Report symptoms</Link></Button>
        </div>
      )}
    </article>
  );
}
