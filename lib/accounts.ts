import "server-only";
import { config } from "@/lib/config";
import { generateTempPassword, generateUserCode } from "@/lib/ids";
import { escapeHtml, sendMail } from "@/lib/mail";
import { isClinician, type Role } from "@/lib/roles";
import type { ServiceClient } from "@/lib/supabase/server";

export const TEMP_PASSWORD_HOURS = 48;

export interface PersonInput {
  last_name: string;
  given_names: string;
  email: string;
  phone: string;
  nic: string;
  job_title?: string;
  staff_id?: string;
}

export interface PatientDetailsInput {
  assigned_doctor_id: string;
  transplant_date: string;
  diagnosis: string;
  diagnosis_other?: string;
  transplant_type: string;
  date_of_birth: string;
  gender: string;
  ec_name: string;
  ec_relationship: string;
  ec_relationship_other?: string;
  ec_phone: string;
}

export interface ClinicianDetailsInput {
  slmc_no: string;
  qualifications: string[];
  specialty: string;
  specialty_other?: string;
  department?: string;
  years_experience?: number;
}

/** How the person gets into their account the first time. */
export type AccessMode =
  | { kind: "password"; password: string } // self sign-up: they chose a password
  | { kind: "temp" } // Hospital Admin / Admin: system makes a temporary password
  | { kind: "invite" }; // created by an admin: Supabase sends an invite code

export interface CreateAccountInput {
  role: Role;
  hospitalId: string | null;
  person: PersonInput;
  patient?: PatientDetailsInput;
  clinician?: ClinicianDetailsInput;
  access: AccessMode;
  createdBy: string | null;
  isPrimaryAdmin?: boolean;
}

export type CreateAccountResult =
  | { ok: true; userId: string; userCode: string; tempPassword?: string }
  | { ok: false; errors: Record<string, string>; message: string };

/** Email, phone, NIC (and SLMC) must be unique. Returns field errors. */
export async function checkUnique(
  db: ServiceClient,
  v: { email?: string; phone?: string; nic?: string; slmc_no?: string },
  exceptId?: string,
): Promise<Record<string, string>> {
  const errors: Record<string, string> = {};
  const checks: [keyof typeof v, string, string][] = [
    ["email", "email", "This email address is already registered"],
    ["phone", "phone", "This telephone number is already registered"],
    ["nic", "nic", "This NIC number is already registered"],
  ];
  for (const [key, column, message] of checks) {
    const value = v[key];
    if (!value) continue;
    let q = db.from("profiles").select("id").eq(column, value);
    if (exceptId) q = q.neq("id", exceptId);
    const { data } = await q.limit(1);
    if (data && data.length) errors[key] = message;
  }
  if (v.slmc_no) {
    let q = db.from("clinician_details").select("profile_id").ilike("slmc_no", v.slmc_no);
    if (exceptId) q = q.neq("profile_id", exceptId);
    const { data } = await q.limit(1);
    if (data && data.length) errors.slmc_no = "This SLMC registration number is already registered";
  }
  return errors;
}

/**
 * Self sign-ups that never finished verifying for 24 hours do not block the
 * email/phone/NIC forever: they are removed so the real owner can register.
 */
async function removeStaleUnverified(db: ServiceClient, v: { email: string; phone: string; nic: string }) {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("status", "pending_verification")
    .is("created_by", null)
    .is("email_verified_at", null)
    .lt("created_at", cutoff)
    .or([`email.eq."${v.email}"`, `phone.eq."${v.phone}"`, `nic.eq."${v.nic}"`].join(","));
  for (const row of data ?? []) await db.auth.admin.deleteUser(row.id);
}

async function findAuthUserIdByEmail(db: ServiceClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (!data || data.users.length < 1000) return null;
  }
  return null;
}

/** Creates the login (Supabase Auth) + profile + role details in one go. Role/hospital/User ID are set HERE. */
export async function createAccount(db: ServiceClient, input: CreateAccountInput): Promise<CreateAccountResult> {
  const { person } = input;
  await removeStaleUnverified(db, person);
  const errors = await checkUnique(db, { ...person, slmc_no: input.clinician?.slmc_no });
  if (Object.keys(errors).length) return { ok: false, errors, message: "Some details are already registered" };

  // An old login without a profile (e.g. from an earlier version) would block this email.
  const orphan = await findAuthUserIdByEmail(db, person.email);
  if (orphan) {
    const { data: hasProfile } = await db.from("profiles").select("id").eq("id", orphan).maybeSingle();
    if (hasProfile) return { ok: false, errors: { email: "This email address is already registered" }, message: "Already registered" };
    await db.auth.admin.deleteUser(orphan);
  }

  let userId: string;
  let tempPassword: string | undefined;
  if (input.access.kind === "invite") {
    const { data, error } = await db.auth.admin.inviteUserByEmail(person.email, { redirectTo: `${config.siteUrl}/invite` });
    if (error || !data.user) return { ok: false, errors: {}, message: error?.message || "Could not send the invite" };
    userId = data.user.id;
  } else {
    const password = input.access.kind === "password" ? input.access.password : (tempPassword = generateTempPassword());
    const { data, error } = await db.auth.admin.createUser({ email: person.email, password, email_confirm: true });
    if (error || !data.user) {
      const weak = /password/i.test(error?.message ?? "");
      return { ok: false, errors: weak ? { password: error!.message } : {}, message: error?.message || "Could not create the login" };
    }
    userId = data.user.id;
  }

  const base = {
    id: userId,
    role: input.role,
    hospital_id: input.role === "platform_admin" ? null : input.hospitalId,
    status: "pending_verification",
    last_name: person.last_name,
    given_names: person.given_names,
    email: person.email,
    phone: person.phone,
    nic: person.nic,
    job_title: person.job_title ?? null,
    staff_id: person.staff_id ?? null,
    is_primary_admin: Boolean(input.isPrimaryAdmin),
    created_by: input.createdBy,
    // Admin-created accounts must set their own password first.
    must_change_password: input.access.kind !== "password",
    temp_password_expires_at:
      input.access.kind === "temp" ? new Date(Date.now() + TEMP_PASSWORD_HOURS * 3600 * 1000).toISOString() : null,
  };

  let userCode = "";
  let inserted = false;
  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    userCode = generateUserCode(input.role);
    const { error } = await db.from("profiles").insert({ ...base, user_code: userCode });
    if (!error) inserted = true;
    else if (!/user_code/.test(error.message)) {
      await db.auth.admin.deleteUser(userId);
      return { ok: false, errors: {}, message: "Could not save the profile: " + error.message };
    }
  }
  if (!inserted) {
    await db.auth.admin.deleteUser(userId);
    return { ok: false, errors: {}, message: "Could not create a User ID, please try again" };
  }

  if (input.role === "patient" && input.patient) {
    const p = input.patient;
    const { error } = await db.from("patient_details").insert({
      profile_id: userId,
      assigned_doctor_id: p.assigned_doctor_id,
      transplant_date: p.transplant_date,
      diagnosis: p.diagnosis,
      diagnosis_other: p.diagnosis_other ?? null,
      transplant_type: p.transplant_type,
      date_of_birth: p.date_of_birth,
      gender: p.gender,
      ec_name: p.ec_name,
      ec_relationship: p.ec_relationship,
      ec_relationship_other: p.ec_relationship === "Other" ? p.ec_relationship_other ?? null : null,
      ec_phone: p.ec_phone,
    });
    if (error) {
      await db.auth.admin.deleteUser(userId);
      return { ok: false, errors: {}, message: "Could not save patient details: " + error.message };
    }
  }
  if (isClinician(input.role) && input.clinician) {
    const c = input.clinician;
    const { error } = await db.from("clinician_details").insert({
      profile_id: userId,
      slmc_no: c.slmc_no,
      qualifications: c.qualifications,
      specialty: c.specialty,
      specialty_other: c.specialty === "Other" ? c.specialty_other ?? null : null,
      department: c.department ?? null,
      years_experience: c.years_experience ?? null,
    });
    if (error) {
      await db.auth.admin.deleteUser(userId);
      const dup = /slmc/i.test(error.message);
      return {
        ok: false,
        errors: dup ? { slmc_no: "This SLMC registration number is already registered" } : {},
        message: dup ? "Already registered" : "Could not save clinician details: " + error.message,
      };
    }
  }
  return { ok: true, userId, userCode, tempPassword };
}

/** Is this doctor an ACTIVE, approved clinician of the given hospital? */
export async function isActiveDoctorOf(db: ServiceClient, doctorId: string, hospitalId: string) {
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("id", doctorId)
    .eq("hospital_id", hospitalId)
    .in("role", ["junior_doctor", "senior_consultant"])
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

/** Can people join this hospital right now? */
export async function isHospitalOpen(db: ServiceClient, hospitalId: string) {
  const { data } = await db.from("hospitals").select("status").eq("id", hospitalId).maybeSingle();
  return data?.status === "active";
}

/** Emails the Hospital Admin's User ID + temporary password (Mailpit locally). Never logged. */
export async function emailCredentials(to: string, name: string, userCode: string, tempPassword: string, hospitalName: string) {
  return sendMail(
    to,
    "Your OncoCare BMT Hospital Admin account",
    `<p>Hello ${escapeHtml(name)},</p>
<p>A Hospital Admin account was created for you at <b>${escapeHtml(hospitalName)}</b>.</p>
<p>User ID: <b>${escapeHtml(userCode)}</b><br/>Temporary password: <b style="font-family:monospace">${escapeHtml(tempPassword)}</b></p>
<p>Open <a href="${config.siteUrl}/activate">${config.siteUrl}/activate</a> within ${TEMP_PASSWORD_HOURS} hours. The temporary password works only once.</p>`,
  );
}

/** Logs a user out on every device. */
export async function revokeSessions(db: ServiceClient, userId: string) {
  await db.rpc("revoke_user_sessions", { target: userId });
}

export async function notifyDetailsChanged(to: string, what: string) {
  return sendMail(
    to,
    "Your OncoCare BMT account details were changed",
    `<p>These account details were changed: <b>${escapeHtml(what)}</b>.</p><p>For your safety you were logged out on other devices. If this was not expected, contact your hospital admin.</p>`,
  );
}

/** Removes all authenticator apps (lost phone). The user sets up a new one at next login. */
export async function resetAuthenticator(db: ServiceClient, userId: string) {
  const { data } = await db.auth.admin.mfa.listFactors({ userId });
  for (const f of data?.factors ?? []) await db.auth.admin.mfa.deleteFactor({ userId, id: f.id });
  await revokeSessions(db, userId);
}
