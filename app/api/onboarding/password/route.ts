import { fail, guardSession, ok, parseBody } from "@/lib/api";
import { auditTargetType, writeAudit } from "@/lib/audit";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { newPasswordSchema } from "@/lib/validation/forms";

/** Replace the temporary / invite password with a permanent one. */
export async function POST(req: Request) {
  const g = await guardSession();
  if ("response" in g) return g.response;
  const { profile } = g.session;
  if (!profile.must_change_password) return fail("Your password is already set", 400);
  const body = await parseBody(req, newPasswordSchema);
  if ("response" in body) return body.response;

  if (profile.temp_password_expires_at && new Date(profile.temp_password_expires_at).getTime() < Date.now()) {
    return fail("Your temporary password has expired. Ask the Admin to regenerate your credentials.", 403);
  }
  const supabase = await createUserClient();
  const { error } = await supabase.auth.updateUser({ password: body.data.password });
  if (error) {
    const same = error.code === "same_password";
    return fail(same ? "Must be different from the temporary password" : error.message, 422, {
      password: same ? "Must be different from the temporary password" : error.message,
    });
  }
  const db = createServiceClient();
  await db
    .from("profiles")
    .update({ must_change_password: false, temp_password_expires_at: null })
    .eq("id", profile.id);
  await writeAudit(db, {
    actorId: profile.id,
    actorRole: profile.role,
    hospitalId: profile.hospital_id,
    action: "account.password_set",
    targetType: auditTargetType(profile.role),
    targetId: profile.id,
    targetLabel: profile.user_code,
  });
  return ok();
}
