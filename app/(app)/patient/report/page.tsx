import Link from "next/link";
import DataTable from "@/components/data/DataTable";
import TierBadge from "@/components/clinical/TierBadge";
import ReportWizard from "@/components/reports/ReportWizard";
import PageHeader from "@/components/shell/PageHeader";
import { colomboDate, fmtDateTime } from "@/lib/dates";
import { loadActiveDischarge } from "@/lib/discharge";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { symptomRule } from "@/config/triage-rules";

const STATUS_WORDS: Record<string, string> = { open: "Waiting", acknowledged: "Seen", escalated: "Escalated", resolved: "Closed" };

export default async function ReportSymptoms({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePage(["patient"]);
  const sp = await searchParams;
  const supabase = await createUserClient(); // RLS: my own rows only
  const [doc, { data: today }, { data: logs }] = await Promise.all([
    loadActiveDischarge(s.profile.hospital_id),
    supabase.from("daily_logs").select("temperature_c").eq("patient_id", s.userId).eq("log_date", colomboDate()).maybeSingle(),
    supabase.from("symptom_logs").select("id, created_at, symptoms, structured, photo_path, day_post_transplant, triage_alerts(tier, status, clinician_reply, replied_at)").eq("patient_id", s.userId).order("created_at", { ascending: false }).limit(1000),
  ]);
  const callList = doc?.sections.find((x) => x.id === "call")?.items ?? [];
  type Row = { id: string; created_at: string; symptoms: string[]; photo_path: string | null; day_post_transplant: number | null; triage_alerts: { tier: "routine" | "urgent" | "emergency"; status: string; clinician_reply: string | null; replied_at: string | null } | { tier: "routine" | "urgent" | "emergency"; status: string; clinician_reply: string | null; replied_at: string | null }[] | null };
  const rows = ((logs ?? []) as unknown as Row[]).map((r) => ({ ...r, alert: Array.isArray(r.triage_alerts) ? r.triage_alerts[0] : r.triage_alerts }));
  const names = (r: (typeof rows)[0]) => r.symptoms.map((k) => symptomRule(k)?.label ?? k).join(", ");
  return (
    <>
      <PageHeader title="Report Symptoms" description="Three quick steps. Safety rules run first, then AI helps your care team sort reports. It is not a diagnosis." />
      <ReportWizard callList={callList} defaultTemp={today?.temperature_c != null ? Number(today.temperature_c) : null} />
      <h2 className="mb-3 mt-10 font-display text-lg font-bold">My reports</h2>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        searchParams={sp}
        basePath="/patient/report"
        defaultSort="date"
        defaultDir="desc"
        searchPlaceholder="Search symptoms or replies"
        empty="You have not sent any reports yet."
        filters={[
          { key: "tier", label: "Urgency", options: [{ value: "routine", label: "Routine" }, { value: "urgent", label: "Urgent" }, { value: "emergency", label: "Emergency" }], match: (r, v) => r.alert?.tier === v },
          { key: "status", label: "Status", options: Object.entries(STATUS_WORDS).map(([value, label]) => ({ value, label })), match: (r, v) => r.alert?.status === v },
        ]}
        columns={[
          { key: "date", header: "Date", sortValue: (r) => new Date(r.created_at), cell: (r) => <span className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}{r.day_post_transplant != null && <span className="block text-muted-foreground">Day +{r.day_post_transplant}</span>}</span> },
          { key: "symptoms", header: "Symptoms", searchText: names, cell: (r) => <span className="text-sm">{names(r)}{r.photo_path && <> · <Link className="text-primary underline" href={`/api/reports/${r.id}/photo`} target="_blank">photo</Link></>}</span> },
          { key: "tier", header: "Urgency", sortValue: (r) => ({ routine: 0, urgent: 1, emergency: 2 })[r.alert?.tier ?? "routine"], cell: (r) => (r.alert ? <TierBadge tier={r.alert.tier} /> : "—") },
          { key: "status", header: "Status", sortValue: (r) => r.alert?.status, cell: (r) => <span className="text-sm">{STATUS_WORDS[r.alert?.status ?? "open"]}</span> },
          { key: "reply", header: "Clinician reply", searchText: (r) => r.alert?.clinician_reply ?? "", cell: (r) => <span className="block max-w-64 text-xs">{r.alert?.clinician_reply ?? <span className="text-muted-foreground">No reply yet</span>}</span> },
        ]}
      />
    </>
  );
}
