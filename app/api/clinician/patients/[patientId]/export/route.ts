import { fail, guardApi } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { logAccess } from "@/lib/recordAccess";
import { resolveRange } from "@/lib/progressCalc";
import { colomboDate } from "@/lib/dates";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

const esc = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV export of a patient's daily logs for a date range. Read with the clinician's own session (RLS), and logged. */
export async function GET(req: Request, ctx: { params: Promise<{ patientId: string }> }) {
  const g = await guardApi(["junior_doctor", "senior_consultant"]);
  if ("response" in g) return g.response;
  const { patientId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) return fail("Not found", 404);
  const u = new URL(req.url).searchParams;
  const supabase = await createUserClient();
  const { data: pd } = await supabase.from("patient_details").select("transplant_date, profiles!patient_details_profile_id_fkey(user_code)").eq("profile_id", patientId).maybeSingle();
  if (!pd) return fail("Not found", 404);
  const code = ((Array.isArray(pd.profiles) ? pd.profiles[0] : pd.profiles) as { user_code: string }).user_code;
  const r = resolveRange({ range: u.get("range") ?? "30", from: u.get("from") ?? undefined, to: u.get("to") ?? undefined }, colomboDate(), pd.transplant_date);
  const { data: logs } = await supabase.from("daily_logs").select("*").eq("patient_id", patientId).gte("log_date", r.from).lte("log_date", r.to).order("log_date");
  const cols = ["log_date", "day_post_transplant", "is_late", "temperature_c", "heart_rate", "bp_systolic", "bp_diastolic", "spo2", "weight_kg", "pain", "fatigue", "appetite", "nausea", "vomiting_episodes", "loose_stools", "bleeding", "mouth_brushing", "mouth_flossed", "mouth_rinses", "lip_care", "emollient_times", "sun_protection", "walking_minutes", "medicines", "notes"];
  const csv = [cols.join(","), ...(logs ?? []).map((l) => cols.map((c) => esc((l as Record<string, unknown>)[c])).join(","))].join("\n");
  const me = g.session.profile;
  await logAccess(me.id, patientId, me.hospital_id!, "export", `daily logs ${r.from} to ${r.to}`);
  await writeAudit(createServiceClient(), { actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id, action: "patient_record.exported", targetType: "patient", targetId: patientId, targetLabel: code, newValue: { range: `${r.from} to ${r.to}` } });
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${code}-daily-logs-${r.from}-to-${r.to}.csv"`, "Cache-Control": "no-store" } });
}
