import { fail, ok, parseBody } from "@/lib/api";
import { anyLocked, clearFailures, LOCKED_MESSAGE, recordFailure } from "@/lib/rateLimit";
import { getSessionState, nextPath } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";
import { codeSchema } from "@/lib/validation/forms";

/** Step 2 of login: the 6-digit authenticator code. Upgrades the session to AAL2. */
export async function POST(req: Request) {
  const body = await parseBody(req, codeSchema);
  if ("response" in body) return body.response;
  const supabase = await createUserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("Please log in again", 401);

  const key = `mfa:${userData.user.id}`;
  if (await anyLocked([key])) return fail(LOCKED_MESSAGE, 429);
  const factor = (userData.user.factors ?? []).find((f) => f.factor_type === "totp" && f.status === "verified");
  if (!factor) return fail("No authenticator app is set up", 400);

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: body.data.code });
  if (error) {
    await recordFailure([key]);
    return fail("That code is not right. Check the app and try again.", 401);
  }
  await clearFailures([key]);
  const state = await getSessionState();
  return ok({ next: state ? nextPath(state) : "/login" });
}
