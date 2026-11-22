import { fail, guardSession, ok, parseBody } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/server";
import { codeSchema } from "@/lib/validation/forms";
import { checkCode } from "@/lib/verify";

export async function POST(req: Request) {
  const g = await guardSession();
  if ("response" in g) return g.response;
  const body = await parseBody(req, codeSchema);
  if ("response" in body) return body.response;
  const { session } = g;
  const r = await checkCode(session.userId, "email", session.authEmail, body.data.code);
  if (!r.ok) return fail(r.message, 401);
  await createServiceClient().from("profiles").update({ email_verified_at: new Date().toISOString() }).eq("id", session.userId);
  return ok();
}
