import "server-only";
import { auditTargetType, writeAudit } from "@/lib/audit";
import { isClinician } from "@/lib/roles";
import { getSessionState, nextPath } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Called after the last verification step. ONLY when email OTP + phone OTP +
 * authenticator are all verified (checked here AND by a database trigger) does
 * the account move on:
 *  - patient                       -> active
 *  - clinician who signed up alone -> pending_approval (Hospital Admin must approve)
 *  - clinician created by an admin -> active
 *  - Hospital Admin / Admin        -> active (+ hospital becomes "Active")
 */
export async function completeOnboarding(): Promise<string> {
  const s = await getSessionState();
  if (!s || !s.profile) return "/login";
  const p = s.profile;
  const ready = p.email_verified_at && p.phone_verified_at && s.hasVerifiedTotp && !p.must_change_password && s.aal === "aal2";
  if (!ready || p.status !== "pending_verification") return nextPath(s);

  const db = createServiceClient();
  const selfSignedClinician = isClinician(p.role) && !p.created_by;
  const status = selfSignedClinician ? "pending_approval" : "active";
  const { error } = await db
    .from("profiles")
    .update({ status, activated_at: status === "active" ? new Date().toISOString() : null })
    .eq("id", p.id);
  if (error) {
    console.error("[onboarding] could not complete:", error.message);
    return "/onboarding";
  }
  if (p.role === "hospital_admin" && p.hospital_id) {
    await db.from("hospitals").update({ status: "active" }).eq("id", p.hospital_id).eq("status", "awaiting_admin_setup");
  }
  await writeAudit(db, {
    actorId: p.id,
    actorRole: p.role,
    hospitalId: p.hospital_id,
    action: "account.verified",
    targetType: auditTargetType(p.role),
    targetId: p.id,
    targetLabel: p.user_code,
    newValue: { status },
  });
  const after = await getSessionState();
  return after ? nextPath(after) : "/login";
}
