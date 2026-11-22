import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { loadManagedPerson } from "@/lib/hospitalUsers";
import { escapeHtml, sendMail } from "@/lib/mail";
import { isClinician } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validation/forms";

/** Approve or reject a PENDING clinician (after checking the SLMC number). Same hospital only. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["hospital_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, reviewSchema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  const db = createServiceClient();
  const person = await loadManagedPerson(db, me, id);
  if (!person || !isClinician(person.role)) return fail("Not found", 404);
  if (person.status !== "pending_approval") return fail("This account is not waiting for approval", 409);

  const approve = body.data.decision === "approve";
  await db
    .from("profiles")
    .update(approve ? { status: "active", status_reason: null, activated_at: new Date().toISOString() } : { status: "rejected", status_reason: body.data.reason })
    .eq("id", id);
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id,
    action: approve ? "clinician.approved" : "clinician.rejected", targetType: "clinician", targetId: id, targetLabel: person.user_code,
    oldValue: { status: "pending_approval" }, newValue: { status: approve ? "active" : "rejected", reason: body.data.reason ?? null },
  });
  await sendMail(
    person.email,
    approve ? "Your OncoCare BMT account is approved" : "Your OncoCare BMT account was not approved",
    approve ? "<p>Your clinician account was approved. You can now log in.</p>" : `<p>Your clinician account was not approved.</p><p>Reason: ${escapeHtml(body.data.reason ?? "")}</p>`,
  );
  return ok();
}
