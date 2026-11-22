import { addDays } from "@/lib/dates";

export interface PlanRow { exercise_id: string; status: "allowed" | "restricted" }
export interface LogRow { exercise_id: string; log_date: string; minutes: number }

/** Last 7 days (today included): % of planned exercise-days completed, and total minutes. */
export function weeklySummary(plan: PlanRow[], logs: LogRow[], today: string, paused = false) {
  const from = addDays(today, -6);
  const week = logs.filter((l) => l.log_date >= from && l.log_date <= today);
  const minutes = week.reduce((a, l) => a + l.minutes, 0);
  const allowed = new Set(plan.filter((p) => p.status === "allowed").map((p) => p.exercise_id));
  const done = new Set(week.filter((l) => allowed.has(l.exercise_id)).map((l) => `${l.exercise_id}|${l.log_date}`)).size;
  const possible = paused ? 0 : allowed.size * 7;
  return { minutes, done, possible, pct: possible ? Math.min(100, Math.round((done / possible) * 100)) : null };
}
