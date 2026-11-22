import { z } from "zod";
import { resetAuthenticator, revokeSessions } from "@/lib/accounts";
import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { regenerateCredentials } from "@/lib/adminOps";
import type { Profile } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({ action: z.enum(["deactivate", "reactivate", "regenerate", "reset_mfa"]), reason: z.string().trim().max(500).optional() });

/** Manage OTHER Admins. You can never deactivate yourself, and the last active Admin always stays. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, schema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  if (id === me.id) return fail("You cannot change your own Admin account here.", 403);
  const db = createServiceClient();
  const { data: target } = await db.from("profiles").select("*").eq("id", id).eq("role", "platform_admin").maybeSingle<Profile>();
  if (!target) return fail("Not found", 404);
  const { action } = body.data;
  if (action !== "regenerate" && (body.data.reason ?? "").length < 3) return fail("Please write a reason", 422);

  if (action === "regenerate") {
    const r = await regenerateCredentials(db, me, target, "OncoCare BMT platform");
    if (!r.ok) return fail(r.message, 409);
    return ok({ userCode: r.userCode, tempPassword: r.tempPassword });
  }
  if (action === "deactivate") {
    if (target.status === "deactivated") return fail("Already deactivated", 409);
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "platform_admin").eq("status", "active").neq("id", id);
    if (!count) return fail("The last active Admin cannot be deactivated.", 409);
    await db.from("profiles").update({ status: "deactivated", status_reason: body.data.reason }).eq("id", id);
    await revokeSessions(db, id);
  } else if (action === "reactivate") {
    if (target.status !== "deactivated") return fail("Not deactivated", 409);
    await db.from("profiles").update({ status: target.activated_at ? "active" : "pending_verification", status_reason: null }).eq("id", id);
  } else {
    await resetAuthenticator(db, id);
  }
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, action: `admin.${action}`, targetType: "platform_admin", targetId: id, targetLabel: target.user_code,
    oldValue: { status: target.status }, newValue: { reason: body.data.reason ?? null },
  });
  return ok();
}
