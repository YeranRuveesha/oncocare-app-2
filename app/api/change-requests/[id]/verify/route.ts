import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { notifyDetailsChanged } from "@/lib/accounts";
import { auditTargetType, writeAudit } from "@/lib/audit";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { codeSchema } from "@/lib/validation/forms";
import { checkCode } from "@/lib/verify";

/** Checks the code for the NEW email / phone, then the server switches it over. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi();
  if ("response" in g) return g.response;
  const body = await parseBody(req, codeSchema);
  if ("response" in body) return body.response;
  const { id } = await ctx.params;
  const me = g.session.profile;
  const db = createServiceClient();
  const { data: cr } = await db.from("change_requests").select("*").eq("id", id).eq("requester_id", me.id).maybeSingle();
  if (!cr || cr.status !== "approved" || cr.applied_at || !["email", "phone"].includes(cr.field_name)) return fail("Nothing to verify", 400);

  const now = new Date().toISOString();
  const supabase = await createUserClient();
  if (cr.field_name === "email") {
    const { error } = await supabase.auth.verifyOtp({ email: cr.new_value, token: body.data.code, type: "email_change" });
    if (error) return fail("That code is wrong or has expired.", 401);
    await db.from("profiles").update({ email: cr.new_value, email_verified_at: now }).eq("id", me.id);
  } else {
    const r = await checkCode(me.id, "sms", cr.new_value, body.data.code);
    if (!r.ok) return fail(r.message, 401);
    await db.from("profiles").update({ phone: cr.new_value, phone_verified_at: now }).eq("id", me.id);
  }
  await db.from("change_requests").update({ applied_at: now }).eq("id", id);
  await supabase.auth.signOut({ scope: "others" });
  // The warning goes to the OLD email address (it still belongs to the account owner, not to whoever just got the new one).
  await notifyDetailsChanged(cr.field_name === "email" && cr.old_value ? cr.old_value : me.email, cr.field_name === "email" ? "Email address" : "Telephone number");
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id, action: "change_request.verified_and_applied",
    targetType: auditTargetType(me.role), targetId: me.id, targetLabel: me.user_code,
    oldValue: { [cr.field_name]: cr.old_value }, newValue: { [cr.field_name]: cr.new_value },
  });
  return ok();
}
