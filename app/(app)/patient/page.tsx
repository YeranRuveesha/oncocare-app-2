import Link from "next/link";
import { ClipboardPlus } from "lucide-react";
import TierBadge from "@/components/clinical/TierBadge";
import PageHeader, { Empty, StatCard } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { toCheckIns } from "@/lib/checkins";
import { daysSinceTransplant } from "@/lib/profileData";
import { colomboDate } from "@/lib/dates";
import { loadActiveDischarge } from "@/lib/discharge";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function PatientDashboard() {
  const s = await requirePage(["patient"]);
  const supabase = await createUserClient(); // RLS: my own rows only
  const today = colomboDate();
  const doc = await loadActiveDischarge(s.profile.hospital_id);
  const [{ data: todayLog }, { data: ack }] = await Promise.all([
    supabase.from("daily_logs").select("id").eq("patient_id", s.userId).eq("log_date", today).maybeSingle(),
    doc ? supabase.from("discharge_acknowledgements").select("id").eq("patient_id", s.userId).eq("instruction_id", doc.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const [{ data: pd }, { data: logs }] = await Promise.all([
    supabase.from("patient_details").select("transplant_date").eq("profile_id", s.userId).single(),
    supabase.from("symptom_logs").select("*, triage_alerts(*)").eq("patient_id", s.userId).order("created_at", { ascending: false }).limit(10),
  ]);
  const day = daysSinceTransplant(pd?.transplant_date) ?? 0;
  const items = toCheckIns(logs ?? [], new Map());
  return (
    <>
      <PageHeader
        title={`Hello, ${s.profile.given_names}`}
        description="How are you feeling today? A quick check-in helps your care team spot problems early."
        actions={<Button asChild variant="brand" size="lg"><Link href="/patient/report"><ClipboardPlus /> Report symptoms</Link></Button>}
      />
      <div className="mb-4 flex flex-col gap-2">
        {!todayLog && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <span>You have not saved today&apos;s daily log yet.</span>
            <Link href="/patient/daily-log" className="font-semibold underline">Add today&apos;s log</Link>
          </div>
        )}
        {doc && !ack && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900">
            <span>Please read your discharge instructions and confirm you have read them.</span>
            <Link href="/patient/discharge-instructions" className="font-semibold underline">Open instructions</Link>
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Post-transplant day" value={`Day +${day}`} />
        <StatCard label="Check-ins sent" value={items.length} />
        <StatCard label="Last check-in" value={items[0] ? new Date(items[0].createdAt).toLocaleDateString("en-GB") : "—"} />
      </div>
      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Recent check-ins</h2>
      {items.length === 0 ? (
        <Empty>No check-ins yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li key={c.id}>
              <Link href={`/patient/results/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-4 hover:border-primary">
                <span className="text-sm">{new Date(c.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · Day +{c.dayPostTransplant ?? "?"}</span>
                <TierBadge tier={c.triage.tier} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 rounded-lg bg-white p-4 text-xs text-muted-foreground">
        In an emergency, do not wait for the app: call your transplant unit or go to the nearest emergency department. This is a demo, not medical advice.
      </p>
    </>
  );
}
