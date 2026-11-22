import { z } from "zod";
import { revokeSessions } from "@/lib/accounts";
import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/supabase/server";
import { reasonSchema } from "@/lib/validation/common";

const schema = z.object({ action: z.enum(["deactivate", "reactivate"]), reason: reasonSchema, confirm_name: z.string().optional() });

/**
 * DEACTIVATE (no permanent delete): needs the typed hospital name + a reason.
 * All its users are logged out and blocked; the data is kept. REACTIVATE later.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, schema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  const db = createServiceClient();
  const { data: h } = await db.from("hospitals").select("*").eq("id", id).maybeSingle();
  if (!h) return fail("Not found", 404);

  if (body.data.action === "deactivate") {
    if (h.status === "deactivated") return fail("Already deactivated", 409);
    if ((body.data.confirm_name ?? "").trim() !== h.name) return fail("Type the hospital name exactly to confirm", 422);
    await db.from("hospitals").update({ status: "deactivated", status_reason: body.data.reason }).eq("id", id);
    const { data: users } = await db.from("profiles").select("id").eq("hospital_id", id);
    for (const u of users ?? []) await revokeSessions(db, u.id);
  } else {
    if (h.status !== "deactivated") return fail("This hospital is not deactivated", 409);
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", id).eq("role", "hospital_admin").eq("status", "active");
    await db.from("hospitals").update({ status: count ? "active" : "awaiting_admin_setup", status_reason: null }).eq("id", id);
  }
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: id, action: `hospital.${body.data.action}d`, targetType: "hospital",
    targetId: id, targetLabel: h.name, oldValue: { status: h.status }, newValue: { reason: body.data.reason },
  });
  return ok();
}
