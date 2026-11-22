import { z } from "zod";
import { resetAuthenticator, revokeSessions } from "@/lib/accounts";
import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { regenerateCredentials } from "@/lib/adminOps";
import type { Profile } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  action: z.enum(["regenerate", "deactivate", "reactivate", "reset_mfa", "make_primary"]),
  reason: z.string().trim().max(500).optional(),
});

/** Hospital Admin management by the Admin. A hospital always keeps at least ONE active Hospital Admin. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, schema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  const db = createServiceClient();
  const { data: target } = await db.from("profiles").select("*").eq("id", id).eq("role", "hospital_admin").maybeSingle<Profile>();
  if (!target) return fail("Not found", 404);
  const { data: h } = await db.from("hospitals").select("id, name").eq("id", target.hospital_id!).single();
  const { action } = body.data;
  const needsReason = action === "deactivate" || action === "reset_mfa" || action === "reactivate";
  if (needsReason && (body.data.reason ?? "").length < 3) return fail("Please write a reason", 422, { reason: "Please write a reason" });

  if (action === "regenerate") {
    const r = await regenerateCredentials(db, me, target, h?.name ?? "");
    if (!r.ok) return fail(r.message, 409);
    return ok({ userCode: r.userCode, tempPassword: r.tempPassword });
  }
  if (action === "deactivate") {
    if (target.status === "deactivated") return fail("Already deactivated", 409);
    if (target.is_primary_admin) return fail("This is the main Hospital Admin. Make another admin the main admin first.", 409);
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true })
      .eq("hospital_id", target.hospital_id!).eq("role", "hospital_admin").eq("status", "active").neq("id", id);
    if (!count) return fail("A hospital must keep at least one ACTIVE Hospital Admin.", 409);
    await db.from("profiles").update({ status: "deactivated", status_reason: body.data.reason }).eq("id", id);
    await revokeSessions(db, id);
  } else if (action === "reactivate") {
    if (target.status !== "deactivated") return fail("Not deactivated", 409);
    await db.from("profiles").update({ status: target.activated_at ? "active" : "pending_verification", status_reason: null }).eq("id", id);
  } else if (action === "reset_mfa") {
    await resetAuthenticator(db, id);
  } else if (action === "make_primary") {
    if (target.status !== "active") return fail("Only an active Hospital Admin can be the main admin", 409);
    await db.from("profiles").update({ is_primary_admin: false }).eq("hospital_id", target.hospital_id!).eq("role", "hospital_admin");
    await db.from("profiles").update({ is_primary_admin: true }).eq("id", id);
  }
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: target.hospital_id, action: `hospital_admin.${action}`,
    targetType: "hospital_admin", targetId: id, targetLabel: target.user_code,
    oldValue: { status: target.status, primary: target.is_primary_admin }, newValue: { reason: body.data.reason ?? null },
  });
  return ok();
}
