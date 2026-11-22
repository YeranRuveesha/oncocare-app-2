import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { notifyDetailsChanged } from "@/lib/accounts";
import { auditTargetType, writeAudit } from "@/lib/audit";
import { applyChange, canReview, validateNewValue } from "@/lib/changes";
import { findField } from "@/lib/fields";
import { escapeHtml, sendMail } from "@/lib/mail";
import type { Profile } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validation/forms";

/** Approve or reject a change request. Approved changes are applied by the SERVER. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["hospital_admin", "platform_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, reviewSchema);
  if ("response" in body) return body.response;
  const { id } = await ctx.params;
  const me = g.session.profile;
  const db = createServiceClient();

  const { data: cr } = await db.from("change_requests").select("*").eq("id", id).maybeSingle();
  if (!cr || !canReview(me, cr)) return fail("Not found", 404);
  if (cr.status !== "pending") return fail("This request was already reviewed", 409);
  const { data: requester } = await db.from("profiles").select("*").eq("id", cr.requester_id).maybeSingle<Profile>();
  if (!requester) return fail("Not found", 404);
  const def = findField(requester.role, cr.field_name);
  if (!def) return fail("Unknown field", 400);

  const now = new Date().toISOString();
  const label = def.label;
  if (body.data.decision === "reject") {
    await db.from("change_requests").update({ status: "rejected", reviewed_by: me.id, review_reason: body.data.reason, reviewed_at: now }).eq("id", id);
    await sendMail(requester.email, "Your OncoCare BMT change request", `<p>Your request to change <b>${escapeHtml(label)}</b> was not approved.</p><p>Reason: ${escapeHtml(body.data.reason ?? "")}</p>`);
  } else {
    // Check the value again: it may have become taken since the request was made.
    const v = await validateNewValue(db, requester, def, def.kind === "multi" ? cr.new_value.split(", ") : cr.new_value);
    if (!v.ok) return fail(`Cannot approve: ${v.message}`, 422);
    const isContact = def.key === "email" || def.key === "phone";
    if (!isContact) {
      try {
        await applyChange(db, requester, def.key, cr.new_value);
      } catch (e) {
        return fail("Could not apply the change: " + (e as Error).message, 500);
      }
      await notifyDetailsChanged(requester.email, label);
    } else {
      await sendMail(requester.email, "Your OncoCare BMT change request was approved", `<p>Your new ${escapeHtml(label.toLowerCase())} was approved. Log in and open My Profile to verify it with a code. Your current one keeps working until then.</p>`);
    }
    await db
      .from("change_requests")
      .update({ status: "approved", reviewed_by: me.id, review_reason: body.data.reason ?? null, reviewed_at: now, applied_at: isContact ? null : now })
      .eq("id", id);
  }
  await writeAudit(db, {
    actorId: me.id,
    actorRole: me.role,
    hospitalId: cr.hospital_id,
    action: body.data.decision === "approve" ? "change_request.approved" : "change_request.rejected",
    targetType: auditTargetType(requester.role),
    targetId: requester.id,
    targetLabel: requester.user_code,
    oldValue: { field: cr.field_name, value: cr.old_value },
    newValue: { field: cr.field_name, value: cr.new_value, reason: body.data.reason ?? null },
  });
  return ok();
}
