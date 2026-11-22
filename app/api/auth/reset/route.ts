import { cookies } from "next/headers";
import { fail, ok, parseBody } from "@/lib/api";
import { auditTargetType, writeAudit } from "@/lib/audit";
import { getSessionState, nextPath } from "@/lib/session";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { newPasswordSchema } from "@/lib/validation/forms";

/**
 * Sets the new password after a reset link. The authenticator is NOT removed:
 * the user still needs their 6-digit code to get in. Other sessions are revoked.
 * Supabase emails "your password was changed".
 */
export async function POST(req: Request) {
  const jar = await cookies();
  if (jar.get("oc_recovery")?.value !== "1") return fail("This reset link has expired. Please ask for a new one.", 403);
  const body = await parseBody(req, newPasswordSchema);
  if ("response" in body) return body.response;

  const supabase = await createUserClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return fail("This reset link has expired. Please ask for a new one.", 401);
  const { error } = await supabase.auth.updateUser({ password: body.data.password });
  if (error) {
    const msg = error.code === "same_password" ? "Must be different from your old password" : error.message;
    return fail(msg, 422, { password: msg });
  }
  await supabase.auth.signOut({ scope: "others" });
  jar.delete("oc_recovery");

  const db = createServiceClient();
  const { data: p } = await db.from("profiles").select("id, role, hospital_id, user_code").eq("id", u.user.id).maybeSingle();
  if (p) {
    await writeAudit(db, {
      actorId: p.id, actorRole: p.role, hospitalId: p.hospital_id, action: "account.password_reset",
      targetType: auditTargetType(p.role),
      targetId: p.id, targetLabel: p.user_code,
    });
  }
  const state = await getSessionState();
  return ok({ next: state ? nextPath(state) : "/login" });
}
