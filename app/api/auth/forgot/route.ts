import { ok, parseBody } from "@/lib/api";
import { config } from "@/lib/config";
import { anyLocked, clientIp, recordFailure } from "@/lib/rateLimit";
import { createServiceClient, createThrowawayClient } from "@/lib/supabase/server";
import { forgotSchema } from "@/lib/validation/forms";

const SAME_MESSAGE = "If an account exists, we have sent reset instructions.";

/** Password reset by EMAIL only. Always the same answer, so nobody can test which emails exist. */
export async function POST(req: Request) {
  const body = await parseBody(req, forgotSchema);
  if ("response" in body) return body.response;
  const key = `forgot:ip:${clientIp(req)}`;
  if (await anyLocked([key])) return ok({ message: SAME_MESSAGE });
  await recordFailure([key]); // counts requests: max 5 per 15 minutes per device

  const { data } = await createServiceClient().from("profiles").select("id, status").eq("email", body.data.email).maybeSingle();
  if (data && data.status !== "deactivated") {
    await createThrowawayClient().auth.resetPasswordForEmail(body.data.email, { redirectTo: `${config.siteUrl}/reset-password` });
  }
  return ok({ message: SAME_MESSAGE });
}
