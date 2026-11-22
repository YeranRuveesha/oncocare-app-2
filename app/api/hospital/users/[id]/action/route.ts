import { z } from "zod";
import { resetAuthenticator, revokeSessions } from "@/lib/accounts";
import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { kindOf, loadManagedPerson } from "@/lib/hospitalUsers";
import { createServiceClient } from "@/lib/supabase/server";
import { reasonSchema } from "@/lib/validation/common";

const schema = z.object({ action: z.enum(["deactivate", "reactivate", "reset_mfa"]), reason: reasonSchema });

/**
 * DELETE = soft delete only: the account is deactivated (cannot log in), the data is kept.
 * Also: reactivate, and reset a lost authenticator after confirming the person's identity.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["hospital_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, schema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  const db = createServiceClient();
  const person = await loadManagedPerson(db, me, id);
  if (!person) return fail("Not found", 404);
  const { action, reason } = body.data;

  if (action === "deactivate") {
    if (person.status === "deactivated") return fail("Already deactivated", 409);
    await db.from("profiles").update({ status: "deactivated", status_reason: reason }).eq("id", id);
    await revokeSessions(db, id);
  } else if (action === "reactivate") {
    if (person.status !== "deactivated") return fail("This account is not deactivated", 409);
    // Back to active only if fully verified before; otherwise they finish verification first.
    const next = person.activated_at ? "active" : "pending_verification";
    await db.from("profiles").update({ status: next, status_reason: null }).eq("id", id);
  } else {
    await resetAuthenticator(db, id);
  }
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id,
    action: action === "reset_mfa" ? "user.authenticator_reset" : `user.${action}d`,
    targetType: kindOf(person.role) === "patients" ? "patient" : "clinician", targetId: id, targetLabel: person.user_code,
    oldValue: { status: person.status }, newValue: { reason },
  });
  return ok();
}
