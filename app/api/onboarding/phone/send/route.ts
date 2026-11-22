import { fail, guardSession, ok } from "@/lib/api";
import { sendPhoneCode } from "@/lib/verify";

export async function POST() {
  const g = await guardSession();
  if ("response" in g) return g.response;
  const { profile } = g.session;
  if (!profile.email_verified_at) return fail("Please verify your email first", 400);
  if (profile.phone_verified_at) return ok({ already: true });
  const err = await sendPhoneCode(profile.id, profile.phone);
  return err ? fail(err, 400) : ok();
}
