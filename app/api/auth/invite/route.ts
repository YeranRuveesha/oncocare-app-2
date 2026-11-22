import { fail, ok, parseBody } from "@/lib/api";
import { anyLocked, clientIp, LOCKED_MESSAGE, recordFailure, clearFailures } from "@/lib/rateLimit";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { inviteCodeSchema } from "@/lib/validation/forms";

/** Opening an invite: email + the 6-digit invite code. This also verifies the email. */
export async function POST(req: Request) {
  const body = await parseBody(req, inviteCodeSchema);
  if ("response" in body) return body.response;
  const keys = [`invite:ip:${clientIp(req)}`, `invite:${body.data.email}`];
  if (await anyLocked(keys)) return fail(LOCKED_MESSAGE, 429);

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: body.data.email, token: body.data.code, type: "invite" });
  if (error || !data.user) {
    await recordFailure(keys);
    return fail("That code is wrong or has expired. Ask your admin to resend the invite.", 401);
  }
  await clearFailures(keys);
  await createServiceClient()
    .from("profiles")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", data.user.id)
    .is("email_verified_at", null);
  return ok({ next: "/onboarding" });
}
