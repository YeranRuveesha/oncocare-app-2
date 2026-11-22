import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { toCheckIns } from "@/lib/checkins";
import { formatDateTime } from "@/lib/utils";
import { symptomLabel } from "@/lib/triage/symptoms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TierBadge, { ScoreBar } from "@/components/clinical/TierBadge";
import type { TriageTier } from "@/lib/types";

const GUIDANCE: Record<TriageTier, { title: string; body: string; tone: string }> = {
  emergency: {
    title: "Contact your transplant unit now",
    body: "Your answers include a red-flag sign. Call your transplant unit's 24-hour number straight away. If you cannot reach them, call your local emergency number (1990 Suwa Seriya in Sri Lanka). Your care team has also been alerted.",
    tone: "border-crimson bg-red-50 text-red-900",
  },
  urgent: {
    title: "Your care team will review this soon",
    body: "A senior clinician has been asked to look at your check-in as a priority today. If you feel worse before they contact you, call your transplant unit.",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
  },
  routine: {
    title: "Thank you, your check-in is logged",
    body: "Nothing in your answers needs urgent action. Your care team will see it in their routine review. Keep checking in daily.",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
};

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requirePage(["patient"]);
  const { id } = await params;
  const supabase = await createUserClient(); // RLS: only my own check-ins
  const { data } = await supabase.from("symptom_logs").select("*, triage_alerts(*)").eq("id", id).maybeSingle();
  const c = data ? toCheckIns([data], new Map()).at(0) : undefined;
  if (!c || c.patientId !== s.userId) notFound();
  const g = GUIDANCE[c.triage.tier];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/patient" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to my recovery
      </Link>

      <section className={`rounded-2xl border-2 p-6 ${g.tone}`} aria-live="polite">
        <TierBadge tier={c.triage.tier} className="text-sm" />
        <h1 className="mt-3 font-display text-2xl font-extrabold">{g.title}</h1>
        <p className="mt-2 leading-relaxed">{g.body}</p>
        {c.triage.tier === "emergency" && (
          <Button asChild variant="destructive" size="lg" className="mt-5">
            <a href="tel:1990"><Phone aria-hidden="true" /> Call emergency (1990)</a>
          </Button>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>What you reported</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">{formatDateTime(c.createdAt)}</p>
          {c.temperatureC !== undefined && <p><strong>Temperature:</strong> {c.temperatureC.toFixed(1)}°C</p>}
          {c.dayPostTransplant !== undefined && <p><strong>Day after transplant:</strong> +{c.dayPostTransplant}</p>}
          <p><strong>Symptoms:</strong> {c.symptoms.length ? c.symptoms.map(symptomLabel).join(", ") : "None ticked"}</p>
          {c.notes && <p><strong>Notes:</strong> {c.notes}</p>}
          <div className="mt-2 flex items-center gap-3 border-t pt-3">
            <span className="text-muted-foreground">Urgency score</span>
            <ScoreBar score={c.triage.urgencyScore} tier={c.triage.tier} />
          </div>
          {c.triage.source === "red_flag_rules" && (
            <ul className="list-disc pl-5 text-muted-foreground">
              {c.triage.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden="true" />
        Demo only, not medical advice. Safety rules are checked before any AI. AI only helps sort the queue; a clinician makes every decision.
      </p>
    </div>
  );
}
