import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { cleanText } from "@/lib/validation/report";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { AlertStatusSchema } from "@/lib/validation/checkin";

/**
 * A clinician acknowledges, escalates, resolves or replies to a report.
 * Visibility is checked with the clinician's own session (RLS: can_view_patient);
 * the write itself is done by the server, so only these fields can change.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["junior_doctor", "senior_consultant"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, AlertStatusSchema);
  if ("response" in body) return body.response;
  const { id } = await ctx.params;
  const supabase = await createUserClient();
  const { data: seen } = await supabase.from("triage_alerts").select("id, status").eq("log_id", id).maybeSingle();
  if (!seen) return fail("Not found", 404);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (body.data.status) Object.assign(patch, { status: body.data.status, reviewed_by: g.session.userId, reviewed_at: now });
  if (body.data.reply) Object.assign(patch, { clinician_reply: cleanText(body.data.reply), replied_by: g.session.userId, replied_at: now });
  const { error } = await createServiceClient().from("triage_alerts").update(patch).eq("id", seen.id);
  if (error) return fail("Update failed", 500);
  return ok();
}
