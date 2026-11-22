import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { createPlatformAdmin } from "@/lib/adminOps";
import { createServiceClient } from "@/lib/supabase/server";
import { adminInviteSchema } from "@/lib/validation/forms";

/** An Admin invites another Admin (temporary credentials shown once + emailed). */
export async function POST(req: Request) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, adminInviteSchema);
  if ("response" in body) return body.response;
  const r = await createPlatformAdmin(createServiceClient(), g.session.profile, body.data);
  if (!r.ok) return fail(r.message, 422, r.errors);
  return ok({ userCode: r.userCode, tempPassword: r.tempPassword });
}
