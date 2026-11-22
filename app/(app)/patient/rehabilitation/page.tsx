import DataTable from "@/components/data/DataTable";
import ExerciseCard, { type ExerciseView } from "@/components/rehab/ExerciseCard";
import PageHeader from "@/components/shell/PageHeader";
import { colomboDate, fmtDate, TZ } from "@/lib/dates";
import { weeklySummary } from "@/lib/rehab";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function Rehabilitation({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePage(["patient"]);
  const sp = await searchParams;
  const supabase = await createUserClient(); // RLS: my own rows only
  const today = colomboDate();
  const [{ data: rehab }, { data: plan }, { data: logs }, { data: dl }] = await Promise.all([
    supabase.from("patient_rehab").select("*").eq("patient_id", s.userId).maybeSingle(),
    supabase.from("patient_exercise_plan").select("status, target, restriction_reason, exercises(id, name, category, description, default_duration, default_sets_reps, precautions)").eq("patient_id", s.userId),
    supabase.from("exercise_logs").select("id, exercise_id, log_date, completed_at, minutes, effort, symptoms, symptom_note, exercises(name)").eq("patient_id", s.userId).order("completed_at", { ascending: false }).limit(1000),
    supabase.from("daily_logs").select("walking_minutes").eq("patient_id", s.userId).eq("log_date", today).maybeSingle(),
  ]);
  type Ex = { id: string; name: string; category: string; description: string; default_duration: string | null; default_sets_reps: string | null; precautions: string | null };
  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] : x);
  const allLogs = (logs ?? []).map((l) => ({ ...l, exName: (one(l.exercises as { name: string } | { name: string }[] | null))?.name ?? "" }));
  const doneToday = new Map(allLogs.filter((l) => l.log_date === today).map((l) => [l.exercise_id, new Date(l.completed_at).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })]));
  const views: ExerciseView[] = (plan ?? []).map((p) => {
    const e = one(p.exercises as Ex | Ex[] | null)!;
    return { id: e.id, name: e.name, category: e.category, description: e.description, duration: e.default_duration, setsReps: e.default_sets_reps, precautions: e.precautions, status: p.status as "allowed" | "restricted", reason: p.restriction_reason, target: p.target, doneAt: doneToday.get(e.id) ?? null };
  }).sort((a, b) => Number(a.status === "restricted") - Number(b.status === "restricted") || a.name.localeCompare(b.name));
  const paused = rehab?.paused ? rehab.pause_reason ?? "your clinician paused them" : null;
  const target = rehab?.walking_target_minutes ?? 15;
  // Walking today = the larger of the daily-log value and walking-category exercise minutes (so nothing is counted twice).
  const walkEx = allLogs.filter((l) => l.log_date === today && views.find((v) => v.id === l.exercise_id)?.category === "walking").reduce((a, l) => a + l.minutes, 0);
  const walked = Math.max(dl?.walking_minutes ?? 0, walkEx);
  const pct = Math.min(100, Math.round((walked / target) * 100));
  const wk = weeklySummary((plan ?? []).map((p) => ({ exercise_id: (one(p.exercises as Ex | Ex[] | null))!.id, status: p.status as "allowed" | "restricted" })), allLogs, today, Boolean(paused));

  return (
    <>
      <PageHeader title="Rehabilitation" description="Gentle exercises chosen by your care team. You cannot add or change exercises yourself." />
      {paused && <p role="status" className="mb-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Your exercises are paused for now: {paused}</p>}

      <section className="mb-6 grid gap-4 sm:grid-cols-3" aria-label="Summary">
        <div className="rounded-xl border bg-white p-4 shadow-sm sm:col-span-2">
          <p className="text-sm font-semibold">Walking today: {walked} of {target} minutes</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Walking goal"><div className="h-full rounded-full bg-[#1B7A7E] transition-all" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">Increase slowly, based on how much energy you have. Your clinician sets the target.</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Last 7 days</p>
          <p className="font-display text-2xl font-extrabold text-primary">{wk.pct === null ? "—" : `${wk.pct}%`}</p>
          <p className="text-xs text-muted-foreground">planned exercises done · {wk.minutes} minutes in total</p>
        </div>
      </section>

      <h2 className="mb-3 font-display text-lg font-bold">Today&apos;s plan</h2>
      {views.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">Your clinician has not chosen exercises for you yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{views.map((v) => <ExerciseCard key={v.id} ex={v} pausedReason={paused} />)}</div>
      )}

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Exercise history</h2>
      <DataTable
        rows={allLogs}
        rowKey={(l) => l.id}
        searchParams={sp}
        basePath="/patient/rehabilitation"
        prefix="h_"
        defaultSort="date"
        defaultDir="desc"
        searchPlaceholder="Search exercise"
        empty="No exercises recorded yet."
        columns={[
          { key: "date", header: "Date", sortValue: (l) => new Date(l.completed_at), cell: (l) => <span className="whitespace-nowrap text-sm">{fmtDate(l.log_date)}</span> },
          { key: "ex", header: "Exercise", sortValue: (l) => l.exName, searchText: (l) => l.exName, cell: (l) => l.exName },
          { key: "min", header: "Minutes", sortValue: (l) => l.minutes, cell: (l) => <span className="tabular-nums">{l.minutes}</span> },
          { key: "eff", header: "Effort", sortValue: (l) => l.effort, cell: (l) => <span className="tabular-nums">{l.effort}/10</span> },
          { key: "sym", header: "Symptoms", sortValue: (l) => Number(l.symptoms), searchText: (l) => l.symptom_note ?? "", cell: (l) => (l.symptoms ? <span className="text-xs text-crimson">Yes{l.symptom_note ? `: ${l.symptom_note}` : ""}</span> : <span className="text-xs text-muted-foreground">None</span>) },
        ]}
      />
    </>
  );
}
