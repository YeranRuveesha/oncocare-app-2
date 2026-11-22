import { randomUUID } from "node:crypto";
import { fail, guardApi, ok } from "@/lib/api";
import { colomboDate, dayPlus } from "@/lib/dates";
import { fullName } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { processReportPhoto } from "@/lib/photo";
import { triageReport } from "@/lib/triage/reportTriage";
import { reportSchema } from "@/lib/validation/report";
import { NEXT_STEPS } from "@/config/triage-rules";

const MAX_PER_HOUR = 10;

/**
 * Patient sends a symptom report (3-step form). The SERVER decides the tier:
 * safety rules first, then AI (which can only raise it). Written with the service role,
 * because patients have read-only access to clinical tables.
 */
export async function POST(req: Request) {
  const g = await guardApi(["patient"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const db = createServiceClient();

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("symptom_logs").select("id", { count: "exact", head: true }).eq("patient_id", me.id).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return fail("You have sent many reports in the last hour. If it is urgent, call your transplant unit.", 429);

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid request");
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("payload") ?? "")); } catch { return fail("Invalid request"); }
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form", 422);
  const d = parsed.data;

  // Photo: only with the rash symptom.
  let photoPath: string | null = null;
  const file = form.get("photo");
  if (file && typeof file !== "string" && file.size > 0) {
    if (!d.symptoms.some((s) => s.key === "rash")) return fail("A photo can only be added for a skin rash.", 422);
    const p = await processReportPhoto(file);
    if (!p.ok) return fail(p.message, 422);
    photoPath = `${me.id}/${randomUUID()}.webp`;
    const up = await db.storage.from("symptom-photos").upload(photoPath, p.data, { contentType: "image/webp", upsert: false });
    if (up.error) return fail("Could not store the photo.", 500);
  }

  const { data: pd } = await db.from("patient_details").select("transplant_date").eq("profile_id", me.id).single();
  const day = dayPlus(pd?.transplant_date, colomboDate());
  const triage = await triageReport({ symptoms: d.symptoms, temperatureC: d.temperatureC, dayPostTransplant: day, notes: d.notes }, [fullName(me), me.given_names, me.last_name]);

  const { data: log, error } = await db.from("symptom_logs").insert({
    patient_id: me.id, hospital_id: me.hospital_id, temperature_c: d.temperatureC ?? null, symptoms: d.symptoms.map((s) => s.key),
    structured: d.symptoms, notes: d.notes || null, day_post_transplant: day, photo_path: photoPath, red_flags: triage.redFlags,
  }).select("id").single();
  if (error || !log) return fail("Could not save your report. Please try again.", 500);
  const { error: e2 } = await db.from("triage_alerts").insert({
    log_id: log.id, patient_id: me.id, hospital_id: me.hospital_id, tier: triage.tier, urgency_score: triage.urgencyScore,
    reasons: triage.reasons, source: triage.source, ai_provider: triage.aiProvider, ai_summary: triage.summary ?? null,
  });
  if (e2) return fail("Could not save the triage result. Please try again.", 500);
  // The patient sees the tier and plain steps. The AI summary is for the care team only.
  return ok({ id: log.id, tier: triage.tier, reasons: triage.reasons, redFlags: triage.redFlags, steps: NEXT_STEPS[triage.tier] });
}
