import { addDays, daysBetween, dayPlus } from "@/lib/dates";

// Pure aggregation for the charts (My Progress and the clinician Statistics tab). Runs on the SERVER.
// Missing days stay missing (null): we never fill gaps with made-up values.

export interface LogRow {
  log_date: string; day_post_transplant: number | null; temperature_c: number | string | null; heart_rate: number | null; bp_systolic: number | null; bp_diastolic: number | null;
  spo2: number | null; weight_kg: number | string | null; pain: number | null; fatigue: number | null; walking_minutes: number | null;
  mouth_brushing: number | null; mouth_rinses: number | null; emollient_times: number | null; medicines: string | null;
}
export interface ExLogRow { log_date: string; minutes: number; exercise_id: string }
export interface ReportRow { created_at: string; tier: "routine" | "urgent" | "emergency"; escalated?: boolean }
export interface DayPoint {
  date: string; label: string; dayN: number | null; temp: number | null; hr: number | null; sys: number | null; dia: number | null; weight: number | null; spo2: number | null;
  pain: number | null; fatigue: number | null; walking: number | null; marker: "routine" | "urgent" | "emergency" | "escalated" | null;
}
export interface WeekPoint { label: string; start: string; exPct: number | null; exMinutes: number; mouth: number | null; emollient: number | null; meds: number | null; routine: number; urgent: number; emergency: number }
export interface Progress {
  from: string; to: string; days: DayPoint[]; weeks: WeekPoint[];
  summary: { dayN: number | null; logsThisWeek: number; avgTemp: number | null; bp: string | null; hr: number | null; exercisePct: number | null; reports: number };
  captions: Record<string, string>;
}

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const rng = (a: string, b: string) => Array.from({ length: daysBetween(a, b) + 1 }, (_, i) => addDays(a, i));
const label = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short" });
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
const tierOf = (r: ReportRow) => r.tier;

export function buildProgress(i: { logs: LogRow[]; exLogs: ExLogRow[]; allowedCount: number; reports: ReportRow[]; transplantDate: string | null; from: string; to: string; today: string }): Progress {
  const { from, to } = i;
  const byDate = new Map(i.logs.map((l) => [l.log_date, l]));
  const repByDate = new Map<string, DayPoint["marker"]>();
  const rank = { routine: 0, urgent: 1, emergency: 2, escalated: 3 } as const;
  for (const r of i.reports) {
    const d = new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
    const m = r.escalated ? "escalated" : tierOf(r);
    const cur = repByDate.get(d);
    if (!cur || rank[m] > rank[cur]) repByDate.set(d, m);
  }
  const days: DayPoint[] = rng(from, to).map((d) => {
    const l = byDate.get(d);
    return {
      date: d, label: label(d), dayN: dayPlus(i.transplantDate, d), temp: n(l?.temperature_c), hr: n(l?.heart_rate), sys: n(l?.bp_systolic), dia: n(l?.bp_diastolic), weight: n(l?.weight_kg),
      spo2: n(l?.spo2), pain: n(l?.pain), fatigue: n(l?.fatigue), walking: n(l?.walking_minutes), marker: repByDate.get(d) ?? null,
    };
  });

  // weekly buckets of 7 days starting at `from`
  const weeks: WeekPoint[] = [];
  for (let s = from; s <= to; s = addDays(s, 7)) {
    const e = addDays(s, 6) > to ? to : addDays(s, 6);
    const inW = (d: string) => d >= s && d <= e;
    const wl = i.logs.filter((l) => inW(l.log_date));
    const exs = i.exLogs.filter((x) => inW(x.log_date));
    const doneSet = new Set(exs.map((x) => `${x.exercise_id}|${x.log_date}`)).size;
    const rs = i.reports.filter((r) => inW(new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" })));
    weeks.push({
      label: label(s), start: s, exPct: i.allowedCount ? Math.min(100, pct(doneSet, i.allowedCount * (daysBetween(s, e) + 1)) ?? 0) : null, exMinutes: exs.reduce((a, x) => a + x.minutes, 0),
      mouth: pct(wl.filter((l) => (l.mouth_brushing ?? 0) >= 2 && (l.mouth_rinses ?? 0) >= 4).length, wl.length),
      emollient: pct(wl.filter((l) => (l.emollient_times ?? 0) >= 1).length, wl.length),
      meds: pct(wl.filter((l) => l.medicines === "Yes").length, wl.length),
      routine: rs.filter((r) => r.tier === "routine").length, urgent: rs.filter((r) => r.tier === "urgent").length, emergency: rs.filter((r) => r.tier === "emergency").length,
    });
  }

  const have = (k: keyof DayPoint) => days.filter((d) => d[k] !== null);
  const temps = have("temp").map((d) => d.temp as number);
  const last = [...days].reverse().find((d) => d.sys !== null);
  const weekFrom = addDays(i.today, -6);
  const allDone = new Set(i.exLogs.map((x) => `${x.exercise_id}|${x.log_date}`)).size;
  const exercisePct = i.allowedCount ? Math.min(100, pct(allDone, i.allowedCount * days.length) ?? 0) : null;
  const normal = temps.filter((t) => t < 38).length;
  const range = (k: keyof DayPoint, unit: string) => { const v = have(k).map((d) => d[k] as number); return v.length ? `${Math.min(...v)} to ${Math.max(...v)}${unit}` : null; };
  const noData = "No data yet. Add your first daily log.";
  const f = (s: string | null, ok: (s: string) => string) => (s ? ok(s) : noData);
  const walkDays = have("walking").filter((d) => (d.walking as number) > 0).length;
  const reports = i.reports.length;
  return {
    from, to, days, weeks,
    summary: {
      dayN: dayPlus(i.transplantDate, i.today), logsThisWeek: i.logs.filter((l) => l.log_date >= weekFrom && l.log_date <= i.today).length,
      avgTemp: temps.length ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null,
      bp: last ? `${last.sys}/${last.dia}` : null, hr: [...days].reverse().find((d) => d.hr !== null)?.hr ?? null, exercisePct, reports,
    },
    captions: {
      temp: temps.length ? `Your temperature was below 38.0 °C on ${normal} of the ${temps.length} days you logged it.` : noData,
      hr: f(range("hr", " bpm"), (r) => `Your logged heart rate ranged from ${r}.`),
      bp: last ? `Your latest blood pressure was ${last.sys}/${last.dia} on ${label(last.date)}.` : noData,
      weight: f(range("weight", " kg") ?? range("spo2", "%"), () => `Weight and oxygen level are shown only for the days you recorded them.`),
      pain: f(range("pain", " out of 10"), (r) => `Your pain scores ranged from ${r}.`),
      walk: walkDays ? `You walked on ${walkDays} of the ${days.length} days in this period.` : noData,
      self: weeks.some((w) => w.mouth !== null) ? "Each bar shows the share of your logged days that week with that self-care done." : noData,
      reports: reports ? `You sent ${reports} symptom report${reports === 1 ? "" : "s"} in this period.` : "You sent no symptom reports in this period.",
    },
  };
}

export type RangeKey = "7" | "30" | "90" | "all" | "custom";
export function resolveRange(sp: { range?: string; from?: string; to?: string }, today: string, transplantDate: string | null): { key: RangeKey; from: string; to: string } {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (sp.range === "custom" && sp.from && sp.to && iso.test(sp.from) && iso.test(sp.to) && sp.from <= sp.to) {
    const to = sp.to > today ? today : sp.to;
    const from = daysBetween(sp.from, to) > 365 ? addDays(to, -365) : sp.from;
    return { key: "custom", from, to };
  }
  if (sp.range === "all") {
    const from = transplantDate && daysBetween(transplantDate, today) <= 365 ? transplantDate : addDays(today, -365);
    return { key: "all", from, to: today };
  }
  const d = sp.range === "7" ? 7 : sp.range === "90" ? 90 : 30;
  return { key: String(d) as RangeKey, from: addDays(today, -(d - 1)), to: today };
}
