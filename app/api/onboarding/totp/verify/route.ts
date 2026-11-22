import { fail, guardSession, ok, parseBody } from "@/lib/api";
import { anyLocked, clearFailures, LOCKED_MESSAGE, recordFailure } from "@/lib/rateLimit";
import { createUserClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/lib/onboarding";
import { z } from "zod";

const schema = z.object({ factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

export async function POST(req: Request) {
  const g = await guardSession();
  if ("response" in g) return g.response;
  const body = await parseBody(req, schema);
  if ("response" in body) return body.response;
  const key = `mfa:${g.session.userId}`;
  if (await anyLocked([key])) return fail(LOCKED_MESSAGE, 429);

  const supabase = await createUserClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: body.data.factorId, code: body.data.code });
  if (error) {
    await recordFailure([key]);
    return fail("That code is not right. Check the app and try again.", 401);
  }
  await clearFailures([key]);
  const next = await completeOnboarding();
  return ok({ next });
}
