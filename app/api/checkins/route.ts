import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { daysSinceTransplant } from "@/lib/profileData";
import { fullName } from "@/lib/roles";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { runTriage } from "@/lib/triage/triageService";
import { CheckInSchema } from "@/lib/validation/checkin";

/** Patient submits a daily check-in. Red-flag rules run first, then AI. The SERVER decides the tier. */
export async function POST(req: Request) {
  const g = await guardApi(["patient"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, CheckInSchema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const db = createServiceClient();
  const { data: pd } = await db.from("patient_details").select("transplant_date").eq("profile_id", me.id).single();
  const day = daysSinceTransplant(pd?.transplant_date) ?? undefined;
  const report = { ...body.data, dayPostTransplant: day };
  const triage = await runTriage(report, [fullName(me), me.given_names, me.last_name]);

  // The log is written with the patient's OWN session (RLS: own rows only)...
  const supabase = await createUserClient();
  const { data: log, error } = await supabase
    .from("symptom_logs")
    .insert({ patient_id: me.id, hospital_id: me.hospital_id, temperature_c: report.temperatureC ?? null, symptoms: report.symptoms, notes: report.notes ?? null, day_post_transplant: day ?? null })
    .select("id")
    .single();
  if (error || !log) return fail("Could not save: " + error?.message, 500);
  // ...the triage result by the server only, so nobody can forge an urgency tier.
  const { error: e2 } = await db.from("triage_alerts").insert({
    log_id: log.id, patient_id: me.id, hospital_id: me.hospital_id, tier: triage.tier, urgency_score: triage.urgencyScore,
    reasons: triage.reasons, source: triage.source, ai_provider: triage.aiProvider, ai_summary: triage.summary ?? null,
  });
  if (e2) return fail("Could not save the triage result: " + e2.message, 500);
  return ok({ checkIn: { id: log.id } });
}
