import Link from "next/link";
import { Lock } from "lucide-react";
import DataTable from "@/components/data/DataTable";
import DailyLogForm from "@/components/dailylog/DailyLogForm";
import PageHeader from "@/components/shell/PageHeader";
import { addDays, colomboDate, dayPlus, fmtDate, fmtDateTime } from "@/lib/dates";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { logDot } from "@/lib/validation/dailyLog";
import { cn } from "@/lib/utils";

const DOT = { red: "bg-crimson", amber: "bg-amber-400", green: "bg-emerald-500" };
const DOT_LABEL = { red: "Please check (fever)", amber: "Worth a look", green: "Looks fine" };

export default async function DailyLog({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePage(["patient"]);
  const sp = await searchParams;
  const supabase = await createUserClient(); // RLS: my own rows only
  const today = colomboDate();
  const days = [today, addDays(today, -1), addDays(today, -2), addDays(today, -3)];
  const date = sp.date && days.includes(sp.date) ? sp.date : today;
  const [{ data: pd }, { data: logs }, { data: edits }] = await Promise.all([
    supabase.from("patient_details").select("transplant_date").eq("profile_id", s.userId).single(),
    supabase.from("daily_logs").select("*").eq("patient_id", s.userId).order("log_date", { ascending: false }).limit(1000),
    supabase.from("daily_log_edits").select("log_id").eq("patient_id", s.userId),
  ]);
  const rows = logs ?? [];
  const byDate = new Map(rows.map((l) => [l.log_date as string, l]));
  const current = byDate.get(date) ?? null;
  const editable = current ? Date.now() - new Date(current.created_at).getTime() <= 24 * 3600_000 : true;
  const editedIds = new Set((edits ?? []).map((e) => e.log_id));
  const dayN = dayPlus(pd?.transplant_date, date);
  const nrm = (v: unknown) => (v === null || v === undefined ? null : Number(v));

  return (
    <>
      <PageHeader title="Daily Log" description={`${fmtDate(date)}${dayN !== null ? ` · Day +${dayN} after transplant` : ""}. One entry per day.`} />
      <nav aria-label="Choose a day" className="mb-4 flex flex-wrap gap-2">
        {days.map((d, i) => (
          <Link key={d} href={d === today ? "/patient/daily-log" : `/patient/daily-log?date=${d}`} aria-current={d === date ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", d === date ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
            {i === 0 ? "Today" : fmtDate(d).slice(0, 6)} {byDate.has(d) ? "✓" : i === 0 ? "" : "(missed)"}
          </Link>
        ))}
      </nav>
      {current && !editable ? (
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold"><Lock className="size-4" aria-hidden="true" /> This log is locked. Logs can be changed for 24 hours only.</p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {([["Temperature", `${current.temperature_c} °C`], ["Heart rate", `${current.heart_rate} bpm`], ["Blood pressure", `${current.bp_systolic}/${current.bp_diastolic}`], ["Pain", `${current.pain}/10`], ["Tiredness", `${current.fatigue}/10`], ["Walking", `${current.walking_minutes} min`], ["Medicines", current.medicines]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
      ) : (
        <DailyLogForm key={date + (current?.updated_at ?? "")} date={date} dayN={dayN} late={date !== today} saved={current ? { ...current, id: current.id, temperature_c: nrm(current.temperature_c) ?? undefined, weight_kg: nrm(current.weight_kg) } : null} />
      )}

      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Log history</h2>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        searchParams={sp}
        basePath="/patient/daily-log"
        prefix="h_"
        defaultSort="date"
        defaultDir="desc"
        empty="No logs yet. Save your first daily log above."
        filters={[{
          key: "range", label: "Dates",
          options: [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }],
          match: (r, v) => (r.log_date as string) >= addDays(today, -Number(v)),
        }]}
        columns={[
          { key: "date", header: "Date", sortValue: (r) => r.log_date, searchText: (r) => r.log_date, cell: (r) => <span className="whitespace-nowrap text-sm">{fmtDate(r.log_date)}{r.is_late && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-900">late</span>}{editedIds.has(r.id) && <span className="ml-1 rounded bg-muted px-1 text-[10px]">edited</span>}</span> },
          { key: "day", header: "Day +N", sortValue: (r) => r.day_post_transplant, cell: (r) => <span className="text-sm tabular-nums">{r.day_post_transplant ?? "—"}</span> },
          { key: "temp", header: "Temp °C", sortValue: (r) => Number(r.temperature_c), cell: (r) => <span className="tabular-nums">{r.temperature_c}</span> },
          { key: "hr", header: "Heart rate", sortValue: (r) => r.heart_rate, cell: (r) => <span className="tabular-nums">{r.heart_rate}</span> },
          { key: "bp", header: "BP", cell: (r) => <span className="tabular-nums">{r.bp_systolic}/{r.bp_diastolic}</span> },
          { key: "dot", header: "Status", sortValue: (r) => ({ red: 2, amber: 1, green: 0 })[logDot({ temperature_c: nrm(r.temperature_c), bleeding: r.bleeding, spo2: r.spo2, pain: r.pain, medicines: r.medicines })], cell: (r) => { const d = logDot({ temperature_c: nrm(r.temperature_c), bleeding: r.bleeding, spo2: r.spo2, pain: r.pain, medicines: r.medicines }); return <span className="inline-flex items-center gap-1.5 text-xs"><span className={cn("size-2.5 rounded-full", DOT[d])} aria-hidden="true" />{DOT_LABEL[d]}</span>; } },
          { key: "saved", header: "Saved", cell: (r) => <span className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</span> },
        ]}
      />
    </>
  );
}
