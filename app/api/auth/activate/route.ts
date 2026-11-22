import { fail, GENERIC_LOGIN_ERROR, ok, parseBody } from "@/lib/api";
import { passwordLogin } from "@/lib/login";
import { LOCKED_MESSAGE } from "@/lib/rateLimit";
import { activateSchema } from "@/lib/validation/forms";

/** First login of a Hospital Admin or Admin: User ID (or email) + temporary password. */
export async function POST(req: Request) {
  const body = await parseBody(req, activateSchema);
  if ("response" in body) return body.response;
  const result = await passwordLogin(req, {
    identifier: body.data.identifier,
    password: body.data.password,
    cards: ["hospital-admin", "admin"],
    activation: true,
  });
  if (!result.ok) return fail(result.locked ? LOCKED_MESSAGE : GENERIC_LOGIN_ERROR, result.locked ? 429 : 401);
  return ok({ next: "/onboarding" });
}
