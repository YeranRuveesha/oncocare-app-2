import Link from "next/link";
import AlertQueue from "@/components/clinical/AlertQueue";
import PageHeader from "@/components/shell/PageHeader";
import { nameMap, toCheckIns } from "@/lib/checkins";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

/** Junior Doctor: routine queue. Senior Consultant: urgent queue (urgent + emergency). */
export default async function TriageQueue({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const s = await requirePage(["junior_doctor", "senior_consultant"]);
  const { show } = await searchParams;
  const senior = s.profile.role === "senior_consultant";
  const supabase = await createUserClient(); // RLS: my assigned patients only
  let q = supabase
    .from("symptom_logs")
    .select("*, triage_alerts!inner(*)")
    .or(senior ? "tier.in.(urgent,emergency),status.eq.escalated" : "tier.eq.routine", { referencedTable: "triage_alerts" })
    .order("created_at", { ascending: false })
    .limit(100);
  if (show !== "all") q = q.neq("triage_alerts.status", "resolved");
  const { data } = await q;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.patient_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, given_names, last_name").in("id", ids) : { data: [] };
  const items = toCheckIns(rows, nameMap(people ?? [])).sort((a, b) => b.triage.urgencyScore - a.triage.urgencyScore);
  return (
    <>
      <PageHeader
        title={senior ? "Urgent queue" : "Routine queue"}
        description={senior ? "Urgent and emergency check-ins from your assigned patients, most urgent first." : "Routine check-ins from your assigned patients."}
        actions={<Link className="text-sm font-medium text-primary hover:underline" href={show === "all" ? "/clinician/triage" : "/clinician/triage?show=all"}>{show === "all" ? "Hide resolved" : "Show resolved too"}</Link>}
      />
      <AlertQueue items={items} canEscalate={!senior} />
    </>
  );
}
