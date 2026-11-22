"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, CheckCheck, ShieldAlert, Thermometer } from "lucide-react";
import type { AlertStatus, CheckIn } from "@/lib/types";
import { symptomLabel } from "@/lib/triage/symptoms";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import TierBadge, { ScoreBar } from "./TierBadge";

const SOURCE_LABEL = { red_flag_rules: "Red-flag rule", ai_assist: "AI assist", mock_ai: "Mock AI (no key)" };
const EDGE = { emergency: "border-l-crimson", urgent: "border-l-amber-400", routine: "border-l-emerald-500" };

export default function AlertQueue({ items, canEscalate = false }: { items: CheckIn[]; canEscalate?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [reply, setReply] = useState<Record<string, string>>({});
  async function setStatus(id: string, status?: AlertStatus, text?: string) {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(status ? { status } : {}), ...(text ? { reply: text } : {}) }),
    });
    setBusy(null);
    if (!res.ok) return setError((await res.json()).error ?? "Update failed");
    if (text) setReply((r) => ({ ...r, [id]: "" }));
    router.refresh();
  }

  if (!items.length) return <p className="rounded-xl border bg-white p-8 text-center text-muted-foreground">No open alerts. All clear.</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      {items.map((c) => (
        <article key={c.id} className={`rounded-xl border border-l-4 bg-white p-5 shadow-sm ${EDGE[c.triage.tier]} ${c.status === "resolved" ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <TierBadge tier={c.triage.tier} />
              <ScoreBar score={c.triage.urgencyScore} tier={c.triage.tier} />
              <h2 className="font-semibold"><a className="hover:underline" href={`/clinician/patients/${c.patientId}`}>{c.patientName}</a></h2>
              {c.dayPostTransplant !== undefined && <span className="text-sm text-muted-foreground">Day +{c.dayPostTransplant}</span>}
            </div>
            <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)} · <span className="capitalize">{c.status}</span></span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {c.temperatureC !== undefined && (
              <span className={`inline-flex items-center gap-1 ${c.temperatureC >= 38 ? "font-semibold text-crimson" : ""}`}>
                <Thermometer className="size-4" aria-hidden="true" /> {c.temperatureC.toFixed(1)}°C
              </span>
            )}
            <span>{c.symptoms.length ? c.symptoms.map(symptomLabel).join(" · ") : "No symptoms ticked"}</span>
          </div>
          {c.structured && (
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {c.structured.map((x) => <li key={x.key} className="rounded-full bg-muted px-2 py-0.5">{symptomLabel(x.key)} · {x.severity} · {x.onset}{x.flag ? " · flagged" : ""}</li>)}
            </ul>
          )}
          {c.hasPhoto && <p className="mt-2 text-sm"><a className="font-medium text-primary underline" href={`/api/reports/${c.id}/photo`} target="_blank" rel="noreferrer">View rash photo</a></p>}
          {c.notes && <p className="mt-2 text-sm italic text-muted-foreground">“{c.notes}”</p>}
          {c.reply && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-900"><b>Reply sent:</b> {c.reply}</p>}

          <div className="mt-3 grid gap-2 rounded-lg bg-ice p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <ShieldAlert className="size-3.5" aria-hidden="true" /> {SOURCE_LABEL[c.triage.source]}
              </p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {c.triage.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
            {c.triage.summary && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Bot className="size-3.5" aria-hidden="true" /> AI summary ({c.triage.aiProvider})
                </p>
                <p className="mt-1 text-muted-foreground">{c.triage.summary}</p>
              </div>
            )}
          </div>

          {c.status !== "resolved" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {c.status === "open" && (
                <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => setStatus(c.id, "acknowledged")}>
                  <Check aria-hidden="true" /> Acknowledge
                </Button>
              )}
              {canEscalate && c.status !== "escalated" && (
                <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => setStatus(c.id, "escalated")}>
                  <ShieldAlert aria-hidden="true" /> Escalate to senior
                </Button>
              )}
              <Button size="sm" variant="brand" disabled={busy === c.id} onClick={() => setStatus(c.id, "resolved")}>
                <CheckCheck aria-hidden="true" /> Mark resolved
              </Button>
            </div>
          )}
          {c.status !== "resolved" && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor={`rp-${c.id}`}>Reply to the patient</label>
              <textarea id={`rp-${c.id}`} rows={2} maxLength={1000} value={reply[c.id] ?? ""} onChange={(e) => setReply((r) => ({ ...r, [c.id]: e.target.value }))} placeholder="Short reply the patient will see" className="min-h-10 flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
              <Button size="sm" variant="outline" disabled={busy === c.id || !(reply[c.id] ?? "").trim()} onClick={() => setStatus(c.id, undefined, reply[c.id])}>Send reply</Button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
