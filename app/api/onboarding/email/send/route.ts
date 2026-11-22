import { fail, guardSession, ok } from "@/lib/api";
import { sendEmailCode } from "@/lib/verify";

export async function POST() {
  const g = await guardSession();
  if ("response" in g) return g.response;
  if (g.session.profile.email_verified_at) return ok({ already: true });
  const err = await sendEmailCode(g.session.authEmail);
  return err ? fail(err, 429) : ok();
}
