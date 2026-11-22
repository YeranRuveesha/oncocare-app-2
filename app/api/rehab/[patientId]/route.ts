import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/supabase/server";
import { rehabChangeSchema } from "@/lib/validation/rehab";

/**
 * Only the clinician ASSIGNED to this patient may prescribe, restrict or pause exercises.
 * Every change keeps its reason in rehab_changes (clinical record) and a short entry in the audit log
 * (without the reason, so Hospital Admins never see clinical details).
 */
export async function POST(req: Request, ctx: { params: Promise<{ patientId: string }> }) {
  const g = await guardApi(["junior_doctor", "senior_consultant"]);
  if ("response" in g) return g.response;
  const { patientId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) return fail("Not found", 404);
  const b = await parseBody(req, rehabChangeSchema);
  if ("response" in b) return b.response;
  const me = g.session.profile;
  const db = createServiceClient();
  const { data: pd } = await db.from("patient_details").select("assigned_doctor_id, profiles!patient_details_profile_id_fkey(hospital_id, user_code)").eq("profile_id", patientId).maybeSingle();
  const prof = (Array.isArray(pd?.profiles) ? pd?.profiles[0] : pd?.profiles) as { hospital_id: string; user_code: string } | undefined;
  if (!pd || !prof || prof.hospital_id !== me.hospital_id) return fail("Not found", 404);
  if (pd.assigned_doctor_id !== me.id) return fail("Only the doctor assigned to this patient can change the exercise plan.", 403);

  const c = b.data;
  const now = new Date().toISOString();
  let oldValue: unknown = null, newValue: unknown = null, exerciseId: string | null = null;

  if (c.action === "set" || c.action === "remove") {
    exerciseId = c.exercise_id;
    const { data: ex } = await db.from("exercises").select("id, name, hospital_id, is_active").eq("id", c.exercise_id).maybeSingle();
    if (!ex || !ex.is_active || (ex.hospital_id && ex.hospital_id !== me.hospital_id)) return fail("Exercise not found", 404);
    const { data: before } = await db.from("patient_exercise_plan").select("status, target, restriction_reason").eq("patient_id", patientId).eq("exercise_id", c.exercise_id).maybeSingle();
    oldValue = before ? { exercise: ex.name, ...before } : { exercise: ex.name, status: "not in plan" };
    if (c.action === "remove") {
      await db.from("patient_exercise_plan").delete().eq("patient_id", patientId).eq("exercise_id", c.exercise_id);
      newValue = { exercise: ex.name, status: "removed" };
    } else {
      const row = { patient_id: patientId, exercise_id: c.exercise_id, status: c.status, target: c.target || null, restriction_reason: c.status === "restricted" ? c.reason : null, set_by: me.id, updated_at: now };
      const { error } = await db.from("patient_exercise_plan").upsert(row, { onConflict: "patient_id,exercise_id" });
      if (error) return fail("Could not save the change.", 500);
      newValue = { exercise: ex.name, status: c.status, target: c.target || null };
    }
  } else {
    const { data: before } = await db.from("patient_rehab").select("paused, pause_reason, walking_target_minutes").eq("patient_id", patientId).maybeSingle();
    oldValue = before ?? { paused: false, walking_target_minutes: 15 };
    const patch = c.action === "pause" ? { paused: true, pause_reason: c.reason } : c.action === "resume" ? { paused: false, pause_reason: null } : { walking_target_minutes: c.minutes };
    const { error } = await db.from("patient_rehab").upsert({ patient_id: patientId, ...patch, updated_by: me.id, updated_at: now }, { onConflict: "patient_id" });
    if (error) return fail("Could not save the change.", 500);
    newValue = patch;
  }
  await db.from("rehab_changes").insert({ patient_id: patientId, hospital_id: me.hospital_id, changed_by: me.id, action: c.action, exercise_id: exerciseId, old_value: oldValue, new_value: newValue, reason: c.reason });
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id, action: `rehab.${c.action}`, targetType: "exercise_plan", targetId: patientId,
    targetLabel: prof.user_code, newValue: { note: "Details are in the clinical record" },
  });
  return ok();
}
