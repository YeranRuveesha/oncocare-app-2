import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { notifyDetailsChanged } from "@/lib/accounts";
import { writeAudit } from "@/lib/audit";
import { validateNewValue } from "@/lib/changes";
import { findField } from "@/lib/fields";
import { fieldValue, loadFullProfile } from "@/lib/profileData";
import { anyLocked, clearFailures, LOCKED_MESSAGE, recordFailure } from "@/lib/rateLimit";
import { createServiceClient, createThrowawayClient, createUserClient } from "@/lib/supabase/server";
import { adminProfileSchema } from "@/lib/validation/adminProfile";

const DIRECT = ["last_name", "given_names", "nic"] as const;
const VERIFIED = ["email", "phone"] as const;
const LABEL: Record<string, string> = { last_name: "Last name", given_names: "Given name/s", nic: "NIC number", email: "Email address", phone: "Telephone number" };

/**
 * The Admin (Super Admin) edits their OWN details directly. No change request, no approval.
 * Every save needs the current password AND a fresh authenticator code.
 * Name and NIC are saved at once. A new email or phone is only switched over after its OTP is verified
 * (the old one keeps working until then); that step reuses /api/change-requests/[id]/send and /verify.
 */
export async function POST(req: Request) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, adminProfileSchema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const db = createServiceClient();
  const rl = [`reauth:${me.id}`];
  if (await anyLocked(rl)) return fail(LOCKED_MESSAGE, 429);
  const b = body.data;

  // 1) Current password (checked with a throwaway client, so the real session is untouched).
  const throwaway = createThrowawayClient();
  const { error: pwErr } = await throwaway.auth.signInWithPassword({ email: g.session.authEmail, password: b.password });
  await throwaway.auth.signOut({ scope: "local" });
  if (pwErr) { await recordFailure(rl); return fail("The password or code is not correct.", 401, { password: "Wrong password" }); }

  // 2) Fresh authenticator code.
  const supabase = await createUserClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === "verified");
  if (!factor) return fail("No authenticator app is set up.", 400);
  const { error: mfaErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: b.totp });
  if (mfaErr) { await recordFailure(rl); return fail("The password or code is not correct.", 401, { totp: "Wrong or expired code" }); }
  await clearFailures(rl);

  // 3) Work out what really changed.
  const fp = (await loadFullProfile(db, me.id))!;
  const direct: Record<string, string> = {};
  const oldDirect: Record<string, string> = {};
  const errors: Record<string, string> = {};
  const pendingKeys: { key: "email" | "phone"; value: string; old: string }[] = [];
  for (const key of [...DIRECT, ...VERIFIED]) {
    const raw = b[key];
    if (raw === undefined) continue;
    const def = findField(me.role, key)!;
    const current = fieldValue(fp, key);
    const v = await validateNewValue(db, me, def, raw);
    if (!v.ok) { errors[key] = v.message; continue; }
    const value = String(v.value);
    if (value === current) continue;
    if ((DIRECT as readonly string[]).includes(key)) { direct[key] = value; oldDirect[key] = current; }
    else pendingKeys.push({ key: key as "email" | "phone", value, old: current });
  }
  if (Object.keys(errors).length) return fail("Please fix the highlighted fields", 422, errors);
  if (!Object.keys(direct).length && !pendingKeys.length) return fail("Nothing was changed.", 422);

  const now = new Date().toISOString();
  if (Object.keys(direct).length) {
    const { error } = await db.from("profiles").update(direct).eq("id", me.id);
    if (error) return fail(/duplicate|unique/i.test(error.message) ? "That NIC number belongs to another account." : "Could not save.", 400);
    await supabase.auth.signOut({ scope: "others" });
    await notifyDetailsChanged(me.email, Object.keys(direct).map((k) => LABEL[k]).join(", "));
    await writeAudit(db, { actorId: me.id, actorRole: me.role, hospitalId: null, action: "admin.profile_updated", targetType: "platform_admin", targetId: me.id, targetLabel: me.user_code, oldValue: oldDirect, newValue: direct });
  }
  // New email / phone: an already-approved request (self-approved) that is applied after OTP verification.
  const verify: { id: string; field: string; value: string }[] = [];
  for (const p of pendingKeys) {
    await db.from("change_requests").update({ status: "rejected", review_reason: "Replaced by a newer edit", reviewed_at: now, reviewed_by: me.id }).eq("requester_id", me.id).eq("field_name", p.key).is("applied_at", null).in("status", ["pending", "approved"]);
    const { data, error } = await db.from("change_requests").insert({
      requester_id: me.id, requester_role: me.role, hospital_id: null, field_name: p.key, old_value: p.old, new_value: p.value,
      reason: "Direct edit by the Admin", status: "approved", reviewed_by: me.id, reviewed_at: now, review_reason: "Self-service (re-verified with password and authenticator)",
    }).select("id").single();
    if (error || !data) return fail("Could not start the verification.", 500);
    verify.push({ id: data.id, field: p.key, value: p.value });
  }
  return ok({ saved: Object.keys(direct), verify });
}
