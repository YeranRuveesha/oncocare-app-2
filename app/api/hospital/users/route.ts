import { z } from "zod";
import { createAccount, isActiveDoctorOf } from "@/lib/accounts";
import { fail, guardApi, ok } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/common";
import { clinicianAdminSchema, patientAdminSchema } from "@/lib/validation/forms";

/**
 * Hospital Admin CREATES a patient or clinician of THEIR hospital.
 * An invite email is sent; the person sets their own password and verifies
 * email, phone and authenticator. The admin never sees or sets the password.
 */
export async function POST(req: Request) {
  const g = await guardApi(["hospital_admin"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = z.enum(["patient", "clinician"]).safeParse(raw?.kind);
  if (!raw || !kind.success) return fail("Invalid request");
  const db = createServiceClient();
  const hospitalId = me.hospital_id!;

  if (kind.data === "patient") {
    const p = patientAdminSchema.safeParse(raw);
    if (!p.success) return fail("Please fix the highlighted fields", 422, fieldErrors(p.error));
    const v = p.data;
    if (!(await isActiveDoctorOf(db, v.assigned_doctor_id, hospitalId))) {
      return fail("Please fix the highlighted fields", 422, { assigned_doctor_id: "Choose an approved doctor from this hospital" });
    }
    const r = await createAccount(db, {
      role: "patient", hospitalId, access: { kind: "invite" }, createdBy: me.id,
      person: { last_name: v.last_name, given_names: v.given_names, email: v.email, phone: v.phone, nic: v.nic },
      patient: { ...v, diagnosis_other: v.diagnosis === "Other" ? v.diagnosis_other : undefined },
    });
    if (!r.ok) return fail(r.message, 422, r.errors);
    await writeAudit(db, { actorId: me.id, actorRole: me.role, hospitalId, action: "user.created", targetType: "patient", targetId: r.userId, targetLabel: r.userCode, newValue: { role: "patient", email: v.email } });
    return ok({ id: r.userId, userCode: r.userCode });
  }

  const c = clinicianAdminSchema.safeParse(raw);
  if (!c.success) return fail("Please fix the highlighted fields", 422, fieldErrors(c.error));
  const v = c.data;
  const r = await createAccount(db, {
    role: v.clinician_role, hospitalId, access: { kind: "invite" }, createdBy: me.id,
    person: { last_name: v.last_name, given_names: v.given_names, email: v.email, phone: v.phone, nic: v.nic },
    clinician: v,
  });
  if (!r.ok) return fail(r.message, 422, r.errors);
  await writeAudit(db, { actorId: me.id, actorRole: me.role, hospitalId, action: "user.created", targetType: "clinician", targetId: r.userId, targetLabel: r.userCode, newValue: { role: v.clinician_role, email: v.email, slmc_no: v.slmc_no } });
  return ok({ id: r.userId, userCode: r.userCode });
}
