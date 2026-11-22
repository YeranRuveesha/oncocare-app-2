import Link from "next/link";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/clinician/AutoRefresh";
import RehabEditor from "@/components/clinician/RehabEditor";
import DataTable from "@/components/data/DataTable";
import TierBadge from "@/components/clinical/TierBadge";
import ProgressCharts from "@/components/progress/ProgressCharts";
import RangeButtons from "@/components/progress/RangeButtons";
import { StatCard } from "@/components/shell/PageHeader";
import { colomboDate, fmtDate, fmtDateTime, dayPlus } from "@/lib/dates";
import { loadProgress } from "@/lib/progress";
import { logAccess } from "@/lib/recordAccess";
import { fullName } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { symptomLabel } from "@/lib/triage/symptoms";
import { symptomRule } from "@/config/triage-rules";
import { logDot } from "@/lib/validation/dailyLog";
import { cn } from "@/lib/utils";

const TABS = [["overview", "Overview"], ["stats", "Statistics"], ["logs", "Daily logs"], ["reports", "Symptom reports"], ["rehab", "Rehabilitation"], ["discharge", "Discharge"]] as const;
const STATUS: Record<string, string> = { open: "Waiting", acknowledged: "Seen", escalated: "Escalated", resolved: "Closed" };
const DOT = { red: "bg-crimson", amber: "bg-amber-400", green: "bg-emerald-500" };
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const one = <T,>(x: T | T[] | null | undefined) => (Array.isArray(x) ? x[0] : x) ?? null;

export default async function PatientDetail({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePage(["junior_doctor", "senior_consultant"]);
  const { patientId } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) notFound();
  const tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as string) : "overview";
  const supabase = await createUserClient(); // RLS (can_view_patient) decides whether this record can be opened at all
  const { data: pd } = await supabase.from("patient_details")
    .select("profile_id, assigned_doctor_id, diagnosis, diagnosis_other, transplant_type, transplant_date, ec_name, ec_relationship, ec_relationship_other, ec_phone, profiles!patient_details_profile_id_fkey(user_code, given_names, last_name, photo_path, hospital_id)")
    .eq("profile_id", patientId).maybeSingle();
  if (!pd) notFound();
  const p = one(pd.profiles as { user_code: string; given_names: string; last_name: string; photo_path: string | null; hospital_id: string } | { user_code: string; given_names: string; last_name: string; photo_path: string | null; hospital_id: string }[])!;
  await logAccess(s.userId, patientId, p.hospital_id, "view");

  const db = createServiceClient();
  const today = colomboDate();
  const [{ data: doc }, signed] = await Promise.all([
    db.from("profiles").select("given_names, last_name").eq("id", pd.assigned_doctor_id).maybeSingle(),
    p.photo_path ? db.storage.from("profile-photos").createSignedUrl(p.photo_path, 300) : Promise.resolve({ data: null }),
  ]);
  const canEdit = pd.assigned_doctor_id === s.userId;
  const dayN = dayPlus(pd.transplant_date, today);
  const dx = pd.diagnosis === "Other" && pd.diagnosis_other ? pd.diagnosis_other : pd.diagnosis;
  const base = `/clinician/patients/${patientId}`;
  const loadedAt = new Date().toISOString();

  return (
    <div className="print-area">
      <header className="mb-5 rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          {signed.data?.signedUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={signed.data.signedUrl} alt="" className="size-16 rounded-full object-cover" /> : <span className="grid size-16 place-items-center rounded-full bg-muted text-lg font-bold">{p.given_names[0]}{p.last_name[0]}</span>}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold text-ink">{fullName(p)}</h1>
            <p className="text-sm text-muted-foreground"><span className="font-mono">{p.user_code}</span> · Day +{dayN} · {dx} · {pd.transplant_type} transplant · Doctor: {canEdit ? "You" : doc ? `Dr ${fullName(doc)}` : "—"}</p>
            <div className="mt-2 inline-block rounded-lg bg-ice px-3 py-1.5 text-xs">
              <b>Emergency contact:</b> {pd.ec_name} ({pd.ec_relationship === "Other" && pd.ec_relationship_other ? pd.ec_relationship_other : pd.ec_relationship}) · {pd.ec_phone}
            </div>
          </div>
          <AutoRefresh loadedAt={loadedAt} />
        </div>
      </header>
      <nav aria-label="Patient record" className="mb-5 flex gap-1 overflow-x-auto border-b print:hidden">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`${base}?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold", tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-ink")}>{l}</Link>
        ))}
      </nav>
      {tab === "overview" && <Overview supabase={supabase} patientId={patientId} today={today} />}
      {tab === "stats" && <Stats supabase={supabase} patientId={patientId} sp={sp} base={base} />}
      {tab === "logs" && <Logs supabase={supabase} patientId={patientId} sp={sp} base={base} />}
      {tab === "reports" && <Reports supabase={supabase} patientId={patientId} sp={sp} base={base} />}
      {tab === "rehab" && <Rehab supabase={supabase} patientId={patientId} sp={sp} base={base} canEdit={canEdit} hospitalId={p.hospital_id} today={today} />}
      {tab === "discharge" && <Discharge supabase={supabase} patientId={patientId} hospitalId={p.hospital_id} />}
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof createUserClient>>;

async function Overview({ supabase, patientId, today }: { supabase: Sb; patientId: string; today: string }) {
  const [{ data: logs }, { data: alerts }] = await Promise.all([
    supabase.from("daily_logs").select("*").eq("patient_id", patientId).order("log_date", { ascending: false }).limit(7),
    supabase.from("symptom_logs").select("id, created_at, symptoms, triage_alerts!inner(tier, status)").eq("patient_id", patientId).neq("triage_alerts.status", "resolved").order("created_at", { ascending: false }).limit(10),
  ]);
  const last = logs?.[0];
  const temps = (logs ?? []).map((l) => Number(l.temperature_c));
  const avg = temps.length ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Latest temperature" value={last ? `${last.temperature_c} °C` : "—"} tone={last && Number(last.temperature_c) >= 38 ? "warn" : "default"} />
        <StatCard label="Latest BP / heart rate" value={last ? `${last.bp_systolic}/${last.bp_diastolic} · ${last.heart_rate}` : "—"} />
        <StatCard label="7-day average temp" value={avg !== null ? `${avg} °C` : "—"} />
        <StatCard label="Last log" value={last ? (last.log_date === today ? "Today" : fmtDate(last.log_date)) : "No logs"} tone={!last || last.log_date !== today ? "warn" : "good"} />
      </div>
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Open alerts</h2>
        {!alerts?.length ? <p className="rounded-xl border border-dashed bg-white p-5 text-center text-sm text-muted-foreground">No open alerts.</p> : (
          <ul className="space-y-2">{alerts.map((a) => { const al = one(a.triage_alerts as { tier: "routine" | "urgent" | "emergency"; status: string } | { tier: "routine" | "urgent" | "emergency"; status: string }[])!; return (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 text-sm"><TierBadge tier={al.tier} /> <span>{fmtDateTime(a.created_at)}</span> <span className="text-muted-foreground">{(a.symptoms as string[]).map((k) => symptomRule(k)?.label ?? symptomLabel(k)).join(", ")}</span> <span className="ml-auto text-xs">{STATUS[al.status]}</span></li>); })}</ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Last 7 days</h2>
        {!logs?.length ? <p className="text-sm text-muted-foreground">No daily logs yet.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{logs.map((l) => { const d = logDot({ temperature_c: num(l.temperature_c), bleeding: l.bleeding, spo2: l.spo2, pain: l.pain, medicines: l.medicines }); return (
            <li key={l.id} className="flex items-center gap-2 rounded-lg border bg-white p-2 text-xs"><span className={cn("size-2.5 rounded-full", DOT[d])} aria-hidden="true" /> <b>{fmtDate(l.log_date)}</b> {l.temperature_c} °C · {l.bp_systolic}/{l.bp_diastolic} · pain {l.pain}</li>); })}</ul>
        )}
      </section>
    </div>
  );
}

async function Stats({ supabase, patientId, sp, base }: { supabase: Sb; patientId: string; sp: Record<string, string | undefined>; base: string }) {
  const { progress, range } = await loadProgress(supabase, patientId, sp);
  return (
    <>
      <RangeButtons basePath={base} active={range.key} from={range.from} to={range.to} custom extra={{ tab: "stats" }} />
      <p className="mb-3 text-xs print:hidden"><a className="font-semibold text-primary underline" href={`/api/clinician/patients/${patientId}/export?${new URLSearchParams({ range: range.key, from: range.from, to: range.to })}`}>Export daily logs for this range (CSV)</a></p>
      <ProgressCharts data={progress} showMarkers />
    </>
  );
}

async function Logs({ supabase, patientId, sp, base }: { supabase: Sb; patientId: string; sp: Record<string, string | undefined>; base: string }) {
  const [{ data: logs }, { data: edits }] = await Promise.all([
    supabase.from("daily_logs").select("*").eq("patient_id", patientId).order("log_date", { ascending: false }).limit(2000),
    supabase.from("daily_log_edits").select("id, log_id, old_values, new_values, edited_at").eq("patient_id", patientId).order("edited_at", { ascending: false }).limit(2000),
  ]);
  const rows = logs ?? [];
  const dateOf = new Map(rows.map((l) => [l.id, l.log_date as string]));
  const nEdits = new Map<string, number>();
  for (const e of edits ?? []) nEdits.set(e.log_id, (nEdits.get(e.log_id) ?? 0) + 1);
  const fmt = (v: Record<string, unknown>) => Object.entries(v).map(([k, x]) => `${k}: ${x ?? "—"}`).join("; ");
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-xs print:hidden"><a className="font-semibold text-primary underline" href={`/api/clinician/patients/${patientId}/export?range=all`}>Export all daily logs (CSV)</a></p>
        <DataTable rows={rows} rowKey={(r) => r.id} searchParams={sp} basePath={base} extraParams={{ tab: "logs" }} prefix="l_" defaultSort="date" defaultDir="desc" searchPlaceholder="Search by date (e.g. 2026-11) or notes" empty="No daily logs yet."
          columns={[
            { key: "date", header: "Date", sortValue: (r) => r.log_date, searchText: (r) => `${r.log_date} ${r.notes ?? ""}`, cell: (r) => <span className="whitespace-nowrap text-sm">{fmtDate(r.log_date)}{r.is_late && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-900">late</span>}{nEdits.get(r.id) ? <span className="ml-1 rounded bg-muted px-1 text-[10px]">edited ×{nEdits.get(r.id)}</span> : null}</span> },
            { key: "day", header: "Day +N", sortValue: (r) => r.day_post_transplant, cell: (r) => r.day_post_transplant ?? "—" },
            { key: "temp", header: "Temp", sortValue: (r) => Number(r.temperature_c), cell: (r) => <span className={cn("tabular-nums", Number(r.temperature_c) >= 38 && "font-bold text-crimson")}>{r.temperature_c}</span> },
            { key: "hr", header: "HR", sortValue: (r) => r.heart_rate, cell: (r) => r.heart_rate },
            { key: "bp", header: "BP", cell: (r) => `${r.bp_systolic}/${r.bp_diastolic}` },
            { key: "spo2", header: "SpO₂", cell: (r) => r.spo2 ?? "–" },
            { key: "pain", header: "Pain", sortValue: (r) => r.pain, cell: (r) => r.pain },
            { key: "fat", header: "Tired", sortValue: (r) => r.fatigue, cell: (r) => r.fatigue },
            { key: "walk", header: "Walk min", sortValue: (r) => r.walking_minutes, cell: (r) => r.walking_minutes },
            { key: "meds", header: "Medicines", sortValue: (r) => r.medicines, cell: (r) => r.medicines },
            { key: "bleed", header: "Bleeding", cell: (r) => (r.bleeding ? <b className="text-crimson">Yes</b> : "No") },
          ]} />
      </div>
      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Edit history (original values are kept)</h2>
        <DataTable rows={edits ?? []} rowKey={(e) => e.id} searchParams={sp} basePath={base} extraParams={{ tab: "logs" }} prefix="e_" defaultSort="when" defaultDir="desc" empty="No log has been edited."
          columns={[
            { key: "when", header: "Edited", sortValue: (e) => new Date(e.edited_at), cell: (e) => <span className="whitespace-nowrap text-xs">{fmtDateTime(e.edited_at)}</span> },
            { key: "log", header: "Log of", sortValue: (e) => dateOf.get(e.log_id), cell: (e) => <span className="text-sm">{dateOf.get(e.log_id) ? fmtDate(dateOf.get(e.log_id)!) : "—"}</span> },
            { key: "old", header: "Original", cell: (e) => <span className="block max-w-72 break-words text-xs text-muted-foreground">{fmt(e.old_values as Record<string, unknown>)}</span> },
            { key: "new", header: "Changed to", cell: (e) => <span className="block max-w-72 break-words text-xs">{fmt(e.new_values as Record<string, unknown>)}</span> },
          ]} />
      </div>
    </div>
  );
}

async function Reports({ supabase, patientId, sp, base }: { supabase: Sb; patientId: string; sp: Record<string, string | undefined>; base: string }) {
  const { data } = await supabase.from("symptom_logs").select("id, created_at, temperature_c, structured, symptoms, notes, photo_path, red_flags, triage_alerts(tier, status, reasons, ai_summary, ai_provider, clinician_reply, replied_at, reviewed_at)").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(2000);
  type A = { tier: "routine" | "urgent" | "emergency"; status: string; reasons: string[]; ai_summary: string | null; ai_provider: string | null; clinician_reply: string | null; replied_at: string | null; reviewed_at: string | null };
  const rows = (data ?? []).map((r) => ({ ...r, a: one(r.triage_alerts as A | A[] | null) }));
  const sy = (r: (typeof rows)[0]) => (Array.isArray(r.structured) && r.structured.length ? (r.structured as { key: string; severity: string; onset: string }[]).map((x) => `${symptomRule(x.key)?.label ?? x.key} (${x.severity}, ${x.onset})`) : (r.symptoms as string[]).map((k) => symptomLabel(k)));
  return (
    <DataTable rows={rows} rowKey={(r) => r.id} searchParams={sp} basePath={base} extraParams={{ tab: "reports" }} prefix="r_" defaultSort="date" defaultDir="desc" searchPlaceholder="Search symptoms or replies" empty="No symptom reports yet."
      filters={[{ key: "tier", label: "Urgency", options: [{ value: "routine", label: "Routine" }, { value: "urgent", label: "Urgent" }, { value: "emergency", label: "Emergency" }], match: (r, v) => r.a?.tier === v }]}
      columns={[
        { key: "date", header: "Date", sortValue: (r) => new Date(r.created_at), cell: (r) => <span className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</span> },
        { key: "sym", header: "Symptoms", searchText: (r) => sy(r).join(" ") + " " + (r.notes ?? ""), cell: (r) => <div className="max-w-80 text-xs"><ul className="list-disc pl-4">{sy(r).map((x) => <li key={x}>{x}</li>)}</ul>{r.temperature_c != null && <p className="mt-1">Temp {r.temperature_c} °C</p>}{r.notes && <p className="mt-1 italic text-muted-foreground">“{r.notes}”</p>}{r.photo_path && <a className="mt-1 inline-block font-medium text-primary underline" href={`/api/reports/${r.id}/photo`} target="_blank" rel="noreferrer">Rash photo</a>}</div> },
        { key: "tier", header: "Urgency", sortValue: (r) => ({ routine: 0, urgent: 1, emergency: 2 })[r.a?.tier ?? "routine"], cell: (r) => (r.a ? <TierBadge tier={r.a.tier} /> : "—") },
        { key: "flags", header: "Rules triggered", searchText: (r) => r.a?.reasons.join(" ") ?? "", cell: (r) => <ul className="max-w-56 list-disc pl-4 text-xs">{(r.a?.reasons ?? []).map((x) => <li key={x} className={(r.red_flags as string[]).includes(x) ? "font-semibold text-crimson" : ""}>{x}</li>)}</ul> },
        { key: "ai", header: "AI summary", searchText: (r) => r.a?.ai_summary ?? "", cell: (r) => <span className="block max-w-64 text-xs text-muted-foreground">{r.a?.ai_summary ?? "—"}</span> },
        { key: "status", header: "Status", sortValue: (r) => r.a?.status, cell: (r) => <span className="text-xs">{STATUS[r.a?.status ?? "open"]}{r.a?.status === "escalated" && r.a.reviewed_at ? ` · ${fmtDateTime(r.a.reviewed_at)}` : ""}</span> },
        { key: "reply", header: "Reply", searchText: (r) => r.a?.clinician_reply ?? "", cell: (r) => <span className="block max-w-56 text-xs">{r.a?.clinician_reply ?? "—"}{r.a?.replied_at && <span className="block text-muted-foreground">{fmtDateTime(r.a.replied_at)}</span>}</span> },
      ]} />
  );
}

async function Rehab({ supabase, patientId, sp, base, canEdit, hospitalId, today }: { supabase: Sb; patientId: string; sp: Record<string, string | undefined>; base: string; canEdit: boolean; hospitalId: string; today: string }) {
  void hospitalId; void today;
  const [{ data: rehab }, { data: plan }, { data: lib }, { data: logs }, { data: changes }] = await Promise.all([
    supabase.from("patient_rehab").select("*").eq("patient_id", patientId).maybeSingle(),
    supabase.from("patient_exercise_plan").select("exercise_id, status, target, restriction_reason, exercises(name)").eq("patient_id", patientId),
    supabase.from("exercises").select("id, name").eq("is_active", true).order("name"),
    supabase.from("exercise_logs").select("id, log_date, completed_at, minutes, effort, symptoms, symptom_note, exercises(name)").eq("patient_id", patientId).order("completed_at", { ascending: false }).limit(2000),
    supabase.from("rehab_changes").select("id, action, new_value, reason, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(500),
  ]);
  const planItems = (plan ?? []).map((p) => ({ exercise_id: p.exercise_id, name: one(p.exercises as { name: string } | { name: string }[] | null)?.name ?? "", status: p.status as "allowed" | "restricted", reason: p.restriction_reason }));
  const hist = (logs ?? []).map((l) => ({ ...l, ex: one(l.exercises as { name: string } | { name: string }[] | null)?.name ?? "" }));
  return (
    <div className="space-y-8">
      {rehab?.paused && <p className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-sm font-semibold text-amber-900">All exercises are paused: {rehab.pause_reason}</p>}
      <p className="text-sm">Walking goal: <b>{rehab?.walking_target_minutes ?? 15} minutes a day</b>. Current plan: {planItems.length ? planItems.map((p) => `${p.name} (${p.status})`).join(", ") : "no exercises yet"}.</p>
      {canEdit ? <RehabEditor patientId={patientId} library={lib ?? []} plan={planItems} paused={Boolean(rehab?.paused)} pauseReason={rehab?.pause_reason ?? null} target={rehab?.walking_target_minutes ?? 15} /> : <p className="rounded-lg bg-ice p-3 text-sm">Only the doctor assigned to this patient can change the exercise plan.</p>}
      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Completed exercises</h2>
        <DataTable rows={hist} rowKey={(l) => l.id} searchParams={sp} basePath={base} extraParams={{ tab: "rehab" }} prefix="x_" defaultSort="date" defaultDir="desc" searchPlaceholder="Search exercise" empty="No exercises recorded yet."
          columns={[
            { key: "date", header: "Date", sortValue: (l) => new Date(l.completed_at), cell: (l) => <span className="whitespace-nowrap text-sm">{fmtDate(l.log_date)}</span> },
            { key: "ex", header: "Exercise", sortValue: (l) => l.ex, searchText: (l) => l.ex, cell: (l) => l.ex },
            { key: "min", header: "Minutes", sortValue: (l) => l.minutes, cell: (l) => l.minutes },
            { key: "eff", header: "Effort", sortValue: (l) => l.effort, cell: (l) => `${l.effort}/10` },
            { key: "sym", header: "Symptoms", searchText: (l) => l.symptom_note ?? "", cell: (l) => (l.symptoms ? <span className="text-xs text-crimson">Yes{l.symptom_note ? `: ${l.symptom_note}` : ""}</span> : <span className="text-xs text-muted-foreground">None</span>) },
          ]} />
      </div>
      <div>
        <h2 className="mb-2 font-display text-lg font-bold">Plan changes and reasons</h2>
        <DataTable rows={changes ?? []} rowKey={(c) => c.id} searchParams={sp} basePath={base} extraParams={{ tab: "rehab" }} prefix="c_" defaultSort="date" defaultDir="desc" empty="No changes yet."
          columns={[
            { key: "date", header: "When", sortValue: (c) => new Date(c.created_at), cell: (c) => <span className="whitespace-nowrap text-xs">{fmtDateTime(c.created_at)}</span> },
            { key: "act", header: "Change", sortValue: (c) => c.action, cell: (c) => <span className="text-xs">{c.action}: {(c.new_value as Record<string, unknown> | null) ? Object.entries(c.new_value as Record<string, unknown>).map(([k, v]) => `${k} ${v ?? ""}`).join(", ") : ""}</span> },
            { key: "why", header: "Reason", searchText: (c) => c.reason, cell: (c) => <span className="text-xs">{c.reason}</span> },
          ]} />
      </div>
    </div>
  );
}

async function Discharge({ supabase, patientId, hospitalId }: { supabase: Sb; patientId: string; hospitalId: string }) {
  const [{ data: active }, { data: acks }] = await Promise.all([
    supabase.from("discharge_instructions").select("id, hospital_id, version, title").eq("is_active", true),
    supabase.from("discharge_acknowledgements").select("instruction_id, version, confirmed_at").eq("patient_id", patientId).order("confirmed_at", { ascending: false }),
  ]);
  const cur = (active ?? []).find((d) => d.hospital_id === hospitalId) ?? (active ?? []).find((d) => d.hospital_id === null);
  const mine = (acks ?? []).find((a) => a.instruction_id === cur?.id);
  return (
    <div className="space-y-3 rounded-xl border bg-white p-5 text-sm shadow-sm">
      <p><b>Version in use:</b> {cur ? `${cur.title} (v${cur.version}${cur.hospital_id ? "" : ", platform default"})` : "None"}</p>
      <p><b>Patient confirmed reading it:</b> {mine ? <span className="text-emerald-700">Yes, on {fmtDateTime(mine.confirmed_at)}</span> : <span className="text-amber-800">Not yet</span>}</p>
      {(acks ?? []).length > 0 && <p className="text-xs text-muted-foreground">Earlier confirmations: {(acks ?? []).map((a) => `v${a.version} on ${fmtDate(new Date(a.confirmed_at))}`).join(", ")}</p>}
    </div>
  );
}
