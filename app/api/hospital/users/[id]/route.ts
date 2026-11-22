import { checkUnique, isActiveDoctorOf, notifyDetailsChanged, revokeSessions } from "@/lib/accounts";
import { fail, guardApi, ok } from "@/lib/api";
import { diff, writeAudit } from "@/lib/audit";
import { kindOf, loadManagedPerson } from "@/lib/hospitalUsers";
import { createServiceClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/common";
import { clinicianAdminSchema, patientAdminSchema } from "@/lib/validation/forms";

/** Hospital Admin EDITS any field of a patient/clinician of their hospital. New email/phone must be verified again. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["hospital_admin"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  const db = createServiceClient();
  const person = await loadManagedPerson(db, me, id);
  if (!person) return fail("Not found", 404);
  const kind = kindOf(person.role)!;
  const raw = await req.json().catch(() => null);

  const parsed = (kind === "patients" ? patientAdminSchema : clinicianAdminSchema).safeParse(raw);
  if (!parsed.success) return fail("Please fix the highlighted fields", 422, fieldErrors(parsed.error));
  const v = parsed.data as Record<string, unknown> & { email: string; phone: string; nic: string };

  const dup = await checkUnique(db, { email: v.email, phone: v.phone, nic: v.nic, slmc_no: (v.slmc_no as string) || undefined }, id);
  if (Object.keys(dup).length) return fail("Some details are already registered", 422, dup);
  if (kind === "patients" && !(await isActiveDoctorOf(db, String(v.assigned_doctor_id), me.hospital_id!))) {
    return fail("Please fix the highlighted fields", 422, { assigned_doctor_id: "Choose an approved doctor from this hospital" });
  }

  const before: Record<string, unknown> = { ...person };
  const profilePatch: Record<string, unknown> = {
    last_name: v.last_name, given_names: v.given_names, email: v.email, phone: v.phone, nic: v.nic,
  };
  if (kind === "clinicians") profilePatch.role = v.clinician_role;
  if (v.email !== person.email) {
    const { error } = await db.auth.admin.updateUserById(id, { email: v.email, email_confirm: true });
    if (error) return fail("Could not change the login email: " + error.message, 422, { email: error.message });
    profilePatch.email_verified_at = null; // must verify the new email by OTP
  }
  if (v.phone !== person.phone) profilePatch.phone_verified_at = null; // must verify the new phone by OTP
  const { error: pe } = await db.from("profiles").update(profilePatch).eq("id", id);
  if (pe) return fail(pe.message, 500);

  let detailsBefore: Record<string, unknown> = {};
  let detailsAfter: Record<string, unknown> = {};
  if (kind === "patients") {
    const { data } = await db.from("patient_details").select("*").eq("profile_id", id).single();
    detailsBefore = data ?? {};
    detailsAfter = {
      assigned_doctor_id: v.assigned_doctor_id, transplant_date: v.transplant_date, diagnosis: v.diagnosis,
      diagnosis_other: v.diagnosis === "Other" ? v.diagnosis_other ?? null : null, transplant_type: v.transplant_type,
      date_of_birth: v.date_of_birth, gender: v.gender, ec_name: v.ec_name, ec_relationship: v.ec_relationship,
      ec_relationship_other: v.ec_relationship === "Other" ? v.ec_relationship_other ?? null : null, ec_phone: v.ec_phone,
    };
    const { error } = await db.from("patient_details").update(detailsAfter).eq("profile_id", id);
    if (error) return fail(error.message, 500);
  } else {
    const { data } = await db.from("clinician_details").select("*").eq("profile_id", id).single();
    detailsBefore = data ?? {};
    detailsAfter = {
      slmc_no: v.slmc_no, qualifications: v.qualifications, specialty: v.specialty,
      specialty_other: v.specialty === "Other" ? v.specialty_other ?? null : null,
      department: v.department ?? null, years_experience: v.years_experience ?? null,
    };
    const { error } = await db.from("clinician_details").update(detailsAfter).eq("profile_id", id);
    if (error) return fail(error.message, 500);
  }

  const d = diff({ ...before, ...detailsBefore }, { ...profilePatch, ...detailsAfter });
  if (d.changed) {
    delete d.oldValue.email_verified_at;
    delete d.newValue.email_verified_at;
    delete d.oldValue.phone_verified_at;
    delete d.newValue.phone_verified_at;
    await writeAudit(db, {
      actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id, action: "user.edited",
      targetType: kind === "patients" ? "patient" : "clinician", targetId: id, targetLabel: person.user_code,
      oldValue: d.oldValue, newValue: d.newValue,
    });
    await revokeSessions(db, id);
    await notifyDetailsChanged(v.email, Object.keys(d.newValue).join(", ").replace(/_/g, " "));
  }
  return ok({ changed: d.changed });
}
