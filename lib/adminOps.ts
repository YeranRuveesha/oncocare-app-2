import "server-only";
import { createAccount, emailCredentials, revokeSessions, TEMP_PASSWORD_HOURS } from "@/lib/accounts";
import { writeAudit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/ids";
import { escapeHtml, sendMail } from "@/lib/mail";
import { config } from "@/lib/config";
import { fullName } from "@/lib/roles";
import type { Profile } from "@/lib/session";
import type { ServiceClient } from "@/lib/supabase/server";

export interface StaffInput {
  last_name: string;
  given_names: string;
  email: string;
  phone: string;
  nic: string;
  job_title?: string;
  staff_id?: string;
}

/** Creates a Hospital Admin with a one-time temporary password (shown once + emailed, never stored). */
export async function createHospitalAdmin(db: ServiceClient, actor: Profile, hospital: { id: string; name: string }, input: StaffInput, primary: boolean) {
  const r = await createAccount(db, {
    role: "hospital_admin",
    hospitalId: hospital.id,
    person: input,
    access: { kind: "temp" },
    createdBy: actor.id,
    isPrimaryAdmin: primary,
  });
  if (!r.ok) return r;
  await emailCredentials(input.email, fullName(input), r.userCode, r.tempPassword!, hospital.name);
  await writeAudit(db, {
    actorId: actor.id, actorRole: actor.role, hospitalId: hospital.id, action: "hospital_admin.created_with_credentials",
    targetType: "hospital_admin", targetId: r.userId, targetLabel: r.userCode, newValue: { email: input.email, primary },
  });
  return r;
}

/** Creates another Admin (invite): temporary credentials shown once and emailed. */
export async function createPlatformAdmin(db: ServiceClient, actor: Profile, input: StaffInput) {
  const r = await createAccount(db, { role: "platform_admin", hospitalId: null, person: input, access: { kind: "temp" }, createdBy: actor.id });
  if (!r.ok) return r;
  await sendMail(
    input.email,
    "You are invited to be an OncoCare BMT Admin",
    `<p>Hello ${escapeHtml(fullName(input))},</p><p>You were invited as a platform Admin.</p>
<p>User ID: <b>${escapeHtml(r.userCode)}</b><br/>Temporary password: <b style="font-family:monospace">${escapeHtml(r.tempPassword!)}</b></p>
<p>Open <a href="${config.siteUrl}/activate">${config.siteUrl}/activate</a> within ${TEMP_PASSWORD_HOURS} hours. It works only once.</p>`,
  );
  await writeAudit(db, {
    actorId: actor.id, actorRole: actor.role, action: "admin.invited", targetType: "platform_admin",
    targetId: r.userId, targetLabel: r.userCode, newValue: { email: input.email },
  });
  return r;
}

/** New temporary password for an account that has NOT been activated yet. The old one stops working. */
export async function regenerateCredentials(db: ServiceClient, actor: Profile, target: Profile, hospitalName: string) {
  if (target.status !== "pending_verification" || !target.must_change_password) {
    return { ok: false as const, message: "This account is already activated. Use 'Reset authenticator' or 'Forgot password' instead." };
  }
  const temp = generateTempPassword();
  const { error } = await db.auth.admin.updateUserById(target.id, { password: temp });
  if (error) return { ok: false as const, message: error.message };
  await db
    .from("profiles")
    .update({ temp_password_expires_at: new Date(Date.now() + TEMP_PASSWORD_HOURS * 3600 * 1000).toISOString(), temp_password_used_at: null, must_change_password: true })
    .eq("id", target.id);
  await revokeSessions(db, target.id);
  await emailCredentials(target.email, fullName(target), target.user_code, temp, hospitalName);
  await writeAudit(db, {
    actorId: actor.id, actorRole: actor.role, hospitalId: target.hospital_id, action: "credentials.regenerated",
    targetType: target.role === "platform_admin" ? "platform_admin" : "hospital_admin", targetId: target.id, targetLabel: target.user_code,
  });
  return { ok: true as const, userCode: target.user_code, tempPassword: temp };
}
