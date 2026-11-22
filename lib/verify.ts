import "server-only";
import { anyLocked, clearFailures, recordFailure } from "@/lib/rateLimit";
import { createServiceClient, createThrowawayClient } from "@/lib/supabase/server";

export const SMS_HELP =
  "The SMS could not be sent. This free demo has no SMS provider: use a Supabase test number (Sri Lanka +94, 77 000 0001 to 77 000 0020). The code is 123456.";

/** Sends a 6-digit code to the email on the login (Supabase sends it; Mailpit shows it locally). */
export async function sendEmailCode(email: string) {
  const c = createThrowawayClient();
  const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return error ? (/rate|seconds/i.test(error.message) ? "Please wait a moment before asking for another code." : "Could not send the code. Please try again.") : null;
}

/**
 * Checks an email or phone code WITHOUT touching the user's real session:
 * a throwaway client verifies it and must return the same user id.
 */
export async function checkCode(
  userId: string,
  kind: "email" | "sms",
  target: string,
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = `otp:${kind}:${userId}`;
  if (await anyLocked([key])) return { ok: false, message: "Too many wrong codes. Please wait 10 minutes." };
  const c = createThrowawayClient();
  const { data, error } =
    kind === "email"
      ? await c.auth.verifyOtp({ email: target, token: code, type: "email" })
      : await c.auth.verifyOtp({ phone: target, token: code, type: "sms" });
  if (error || data.user?.id !== userId) {
    await recordFailure([key]);
    return { ok: false, message: "That code is wrong or has expired. Try again or resend the code." };
  }
  await c.auth.signOut({ scope: "local" });
  await clearFailures([key]);
  return { ok: true };
}

/** Puts the phone on the login, then sends the SMS code (fixed code for test numbers). */
export async function sendPhoneCode(userId: string, phone: string) {
  const db = createServiceClient();
  const { error: setErr } = await db.auth.admin.updateUserById(userId, { phone: phone.replace(/^\+/, ""), phone_confirm: true });
  if (setErr) return /already/i.test(setErr.message) ? "This telephone number is used by another account." : setErr.message;
  const c = createThrowawayClient();
  const { error } = await c.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
  if (error) return /rate|seconds/i.test(error.message) ? "Please wait a moment before asking for another code." : SMS_HELP;
  return null;
}
