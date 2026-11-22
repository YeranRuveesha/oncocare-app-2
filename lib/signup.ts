import "server-only";
import { createAccount, isActiveDoctorOf, isHospitalOpen } from "@/lib/accounts";
import { fail, ok } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { anyLocked, clientIp, LOCKED_MESSAGE, recordFailure } from "@/lib/rateLimit";
import type { Role } from "@/lib/roles";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import type { PatientDetailsInput, ClinicianDetailsInput, PersonInput } from "@/lib/accounts";

/**
 * Shared by the patient and clinician sign-up routes.
 * Role, hospital checks and User ID are decided HERE, never by the browser.
 */
export async function selfSignup(
  req: Request,
  args: {
    role: Role;
    hospitalId: string;
    person: PersonInput;
    password: string;
    patient?: PatientDetailsInput;
    clinician?: ClinicianDetailsInput;
  },
) {
  const ipKey = `signup:ip:${clientIp(req)}`;
  if (await anyLocked([ipKey])) return fail(LOCKED_MESSAGE, 429);

  const db = createServiceClient();
  if (!(await isHospitalOpen(db, args.hospitalId))) {
    return fail("Please fix the highlighted fields", 422, { hospital_id: "This hospital is not open for sign-up" });
  }
  if (args.patient && !(await isActiveDoctorOf(db, args.patient.assigned_doctor_id, args.hospitalId))) {
    return fail("Please fix the highlighted fields", 422, { assigned_doctor_id: "Choose an approved doctor from this hospital" });
  }

  const result = await createAccount(db, {
    role: args.role,
    hospitalId: args.hospitalId,
    person: args.person,
    patient: args.patient,
    clinician: args.clinician,
    access: { kind: "password", password: args.password },
    createdBy: null,
  });
  if (!result.ok) {
    await recordFailure([ipKey]);
    return fail(result.message, 422, result.errors);
  }

  await writeAudit(db, {
    actorId: result.userId,
    actorRole: args.role,
    hospitalId: args.hospitalId,
    action: "user.signed_up",
    targetType: args.role === "patient" ? "patient" : "clinician",
    targetId: result.userId,
    targetLabel: result.userCode,
  });

  // Log in straight away (password only). The verification steps come next.
  const supabase = await createUserClient();
  await supabase.auth.signInWithPassword({ email: args.person.email, password: args.password });
  return ok({ userCode: result.userCode, next: "/onboarding" });
}
