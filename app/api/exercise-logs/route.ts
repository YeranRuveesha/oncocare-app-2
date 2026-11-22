import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { colomboDate } from "@/lib/dates";
import { createServiceClient } from "@/lib/supabase/server";
import { exerciseLogSchema } from "@/lib/validation/rehab";

/** Patient records a finished exercise. Only exercises the clinician allowed, and not while rehab is paused. */
export async function POST(req: Request) {
  const g = await guardApi(["patient"]);
  if ("response" in g) return g.response;
  const b = await parseBody(req, exerciseLogSchema);
  if ("response" in b) return b.response;
  const me = g.session.profile;
  const db = createServiceClient();
  const [{ data: plan }, { data: rehab }] = await Promise.all([
    db.from("patient_exercise_plan").select("status").eq("patient_id", me.id).eq("exercise_id", b.data.exercise_id).maybeSingle(),
    db.from("patient_rehab").select("paused").eq("patient_id", me.id).maybeSingle(),
  ]);
  if (!plan) return fail("This exercise is not in your plan.", 403);
  if (rehab?.paused) return fail("Your clinician has paused your exercises for now.", 403);
  if (plan.status !== "allowed") return fail("This exercise is restricted for now.", 403);
  const today = colomboDate();
  const { count } = await db.from("exercise_logs").select("id", { count: "exact", head: true }).eq("patient_id", me.id).eq("exercise_id", b.data.exercise_id).eq("log_date", today);
  if ((count ?? 0) > 0) return fail("You already recorded this exercise today.", 409);
  const { error } = await db.from("exercise_logs").insert({
    patient_id: me.id, hospital_id: me.hospital_id, exercise_id: b.data.exercise_id, log_date: today, minutes: b.data.minutes, effort: b.data.effort,
    symptoms: b.data.symptoms, symptom_note: b.data.symptoms ? b.data.symptom_note || null : null,
  });
  if (error) return fail("Could not save. Please try again.", 500);
  return ok({ symptoms: b.data.symptoms });
}
