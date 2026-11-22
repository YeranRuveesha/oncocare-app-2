import { fail, GENERIC_LOGIN_ERROR, ok, parseBody } from "@/lib/api";
import { passwordLogin } from "@/lib/login";
import { LOCKED_MESSAGE } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/validation/forms";

/** Step 1 of login: identifier + password for the chosen role card. Step 2 is the authenticator code. */
export async function POST(req: Request) {
  const body = await parseBody(req, loginSchema);
  if ("response" in body) return body.response;
  const { card, identifier, password } = body.data;
  const result = await passwordLogin(req, { identifier, password, cards: [card] });
  if (!result.ok) return fail(result.locked ? LOCKED_MESSAGE : GENERIC_LOGIN_ERROR, result.locked ? 429 : 401);
  const p = result.profile;
  const needsSetup =
    p.must_change_password || !p.email_verified_at || !p.phone_verified_at || p.status === "pending_verification";
  return ok({ next: needsSetup ? "/onboarding" : "/login/verify" });
}
