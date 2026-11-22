import "server-only";
import { colomboDate } from "@/lib/dates";
import { buildProgress, resolveRange, type Progress } from "@/lib/progressCalc";
import type { createUserClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createUserClient>>;

/** Loads a patient's rows (with the caller's own session, so RLS decides) and aggregates them on the server. */
export async function loadProgress(supabase: Client, patientId: string, sp: { range?: string; from?: string; to?: string }) {
  const today = colomboDate();
  const { data: pd } = await supabase.from("patient_details").select("transplant_date").eq("profile_id", patientId).maybeSingle();
  const r = resolveRange(sp, today, pd?.transplant_date ?? null);
  const [{ data: logs }, { data: exLogs }, { data: plan }, { data: reps }] = await Promise.all([
    supabase.from("daily_logs").select("*").eq("patient_id", patientId).gte("log_date", r.from).lte("log_date", r.to).order("log_date"),
    supabase.from("exercise_logs").select("log_date, minutes, exercise_id").eq("patient_id", patientId).gte("log_date", r.from).lte("log_date", r.to),
    supabase.from("patient_exercise_plan").select("status").eq("patient_id", patientId),
    supabase.from("symptom_logs").select("created_at, triage_alerts(tier, status)").eq("patient_id", patientId).gte("created_at", new Date(r.from + "T00:00:00+05:30").toISOString()).lte("created_at", new Date(r.to + "T23:59:59+05:30").toISOString()),
  ]);
  const reports = (reps ?? []).map((x) => {
    const a = (Array.isArray(x.triage_alerts) ? x.triage_alerts[0] : x.triage_alerts) as { tier: "routine" | "urgent" | "emergency"; status: string } | null;
    return { created_at: x.created_at as string, tier: a?.tier ?? "routine", escalated: a?.status === "escalated" };
  });
  const progress: Progress = buildProgress({
    logs: logs ?? [], exLogs: exLogs ?? [], allowedCount: (plan ?? []).filter((p) => p.status === "allowed").length, reports, transplantDate: pd?.transplant_date ?? null, ...r, today,
  });
  return { progress, range: r, hasTransplantDate: Boolean(pd?.transplant_date) };
}
