import Link from "next/link";
import DataTable from "@/components/data/DataTable";
import TierBadge from "@/components/clinical/TierBadge";
import PageHeader from "@/components/shell/PageHeader";
import { colomboDate, daysBetween, dayPlus, fmtDate } from "@/lib/dates";
import { DIAGNOSES, TRANSPLANT_TYPES } from "@/lib/options";
import { fullName } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/dates";
import { cn } from "@/lib/utils";

const RANK = { none: 0, routine: 1, urgent: 2, emergency: 3 } as const;
type Level = keyof typeof RANK;

export default async function MyPatients({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePage(["junior_doctor", "senior_consultant"]);
  const sp = await searchParams;
  const supabase = await createUserClient(); // RLS (can_view_patient): ONLY the patients assigned to this doctor
  const today = colomboDate();
  const [{ data: details }, { data: logs }, { data: alerts }] = await Promise.all([
    supabase.from("patient_details").select("profile_id, assigned_doctor_id, diagnosis, diagnosis_other, transplant_type, transplant_date, profiles!patient_details_profile_id_fkey(id, user_code, given_names, last_name, photo_path, status)").eq("assigned_doctor_id", s.userId).limit(1000),
    supabase.from("daily_logs").select("patient_id, log_date").gte("log_date", addDays(today, -400)).order("log_date", { ascending: false }).limit(5000),
    supabase.from("triage_alerts").select("patient_id, tier, status").neq("status", "resolved").limit(5000),
  ]);
  const lastLog = new Map<string, string>();
  for (const l of logs ?? []) if (!lastLog.has(l.patient_id)) lastLog.set(l.patient_id, l.log_date);
  const level = new Map<string, Level>();
  for (const a of alerts ?? []) { const t = a.tier as Level; if (RANK[t] > RANK[level.get(a.patient_id) ?? "none"]) level.set(a.patient_id, t); }
  type P = { id: string; user_code: string; given_names: string; last_name: string; photo_path: string | null; status: string };
  const rows = (details ?? []).map((d) => {
    const p = (Array.isArray(d.profiles) ? d.profiles[0] : d.profiles) as P;
    return { ...d, p, day: dayPlus(d.transplant_date, today), last: lastLog.get(d.profile_id) ?? null, level: level.get(d.profile_id) ?? ("none" as Level) };
  }).filter((r) => r.p && r.p.status === "active");

  // names of assigned doctors + signed photo links (server only; the list itself already passed RLS)
  const db = createServiceClient();
  const docIds = [...new Set(rows.map((r) => r.assigned_doctor_id))];
  const paths = rows.map((r) => r.p.photo_path).filter(Boolean) as string[];
  const [{ data: docs }, signed] = await Promise.all([
    docIds.length ? db.from("profiles").select("id, given_names, last_name").in("id", docIds) : Promise.resolve({ data: [] as { id: string; given_names: string; last_name: string }[] }),
    paths.length ? db.storage.from("profile-photos").createSignedUrls(paths, 300) : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
  ]);
  const docName = new Map((docs ?? []).map((d) => [d.id, `Dr ${fullName(d)}`]));
  const photo = new Map((signed.data ?? []).filter((x) => x.path).map((x) => [x.path as string, x.signedUrl]));
  const photoUrl = (p: string | null): string | undefined => (p ? photo.get(p) ?? undefined : undefined);
  const sinceLog = (r: (typeof rows)[0]) => (r.last ? daysBetween(r.last, today) : 999);
  const diag = (r: (typeof rows)[0]) => (r.diagnosis === "Other" && r.diagnosis_other ? r.diagnosis_other : r.diagnosis);
  const attention = (r: (typeof rows)[0]) => r.level === "emergency" || r.level === "urgent" || sinceLog(r) >= 2;

  return (
    <>
      <PageHeader title="My Patients" description="Search, filter and sort. Urgent alerts and patients with no log for 2 or more days are highlighted." />
      <DataTable
        rows={rows}
        rowKey={(r) => r.profile_id}
        searchParams={sp}
        basePath="/clinician/patients"
        defaultSort="alert"
        defaultDir="desc"
        searchPlaceholder="Search name, User ID or diagnosis"
        empty="No patients to show yet."
        rowClass={(r) => (r.level === "emergency" ? "bg-red-50" : attention(r) ? "bg-amber-50/60" : "")}
        filters={[
          { key: "dx", label: "Diagnosis", options: DIAGNOSES.map((d) => ({ value: d, label: d })), match: (r, v) => r.diagnosis === v },
          { key: "type", label: "Transplant", options: TRANSPLANT_TYPES.map((d) => ({ value: d, label: d })), match: (r, v) => r.transplant_type === v },
          { key: "alert", label: "Alert level", options: [{ value: "emergency", label: "Emergency" }, { value: "urgent", label: "Urgent" }, { value: "routine", label: "Routine" }, { value: "none", label: "No reports" }], match: (r, v) => r.level === v },
          { key: "missing", label: "Today's log", options: [{ value: "1", label: "Missing today" }], match: (r) => r.last !== today },
          { key: "day", label: "Day +N", options: [{ value: "0-30", label: "0 to 30" }, { value: "31-100", label: "31 to 100" }, { value: "101-365", label: "101 to 365" }, { value: "366-99999", label: "Over 365" }], match: (r, v) => { const [a, b] = v.split("-").map(Number); return r.day !== null && r.day >= a && r.day <= b; } },
        ]}
        columns={[
          { key: "name", header: "Patient", sortValue: (r) => fullName(r.p), searchText: (r) => `${fullName(r.p)} ${r.p.user_code} ${diag(r)}`, cell: (r) => (
            <Link href={`/clinician/patients/${r.profile_id}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
              {photoUrl(r.p.photo_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(r.p.photo_path)} alt="" className="size-8 rounded-full object-cover" />
              ) : <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-bold text-ink">{r.p.given_names[0]}{r.p.last_name[0]}</span>}
              {fullName(r.p)}
            </Link>
          ) },
          { key: "code", header: "User ID", sortValue: (r) => r.p.user_code, cell: (r) => <span className="font-mono text-xs">{r.p.user_code}</span> },
          { key: "dx", header: "Diagnosis", sortValue: diag, cell: diag },
          { key: "type", header: "Transplant", sortValue: (r) => r.transplant_type, cell: (r) => r.transplant_type },
          { key: "day", header: "Day +N", sortValue: (r) => r.day, cell: (r) => <span className="font-semibold tabular-nums">+{r.day}</span> },
          { key: "last", header: "Last log", sortValue: (r) => r.last, cell: (r) => <span className={cn("whitespace-nowrap text-xs", sinceLog(r) >= 2 && "font-semibold text-amber-800")}>{r.last ? fmtDate(r.last) : "No logs"}</span> },
          { key: "alert", header: "Alert level", sortValue: (r) => RANK[r.level] * 10000 + Math.min(sinceLog(r), 999), cell: (r) => (r.level === "none" ? <span className="text-xs text-muted-foreground">No reports</span> : <TierBadge tier={r.level} />) },
          { key: "doc", header: "Assigned doctor", sortValue: (r) => docName.get(r.assigned_doctor_id), searchText: (r) => docName.get(r.assigned_doctor_id) ?? "", cell: (r) => <span className="text-xs">{r.assigned_doctor_id === s.userId ? "You" : docName.get(r.assigned_doctor_id) ?? "—"}</span> },
        ]}
      />
    </>
  );
}
