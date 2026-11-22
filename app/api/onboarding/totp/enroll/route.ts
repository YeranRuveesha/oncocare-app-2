import { fail, guardSession, ok } from "@/lib/api";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

/** Makes a NEW, unique TOTP secret + QR code for this user (Supabase MFA). */
export async function POST() {
  const g = await guardSession();
  if ("response" in g) return g.response;
  const { profile, hasVerifiedTotp } = g.session;
  if (!profile.email_verified_at || !profile.phone_verified_at) return fail("Verify your email and phone first", 400);
  if (hasVerifiedTotp) return fail("Your authenticator app is already set up", 400);

  // Remove half-finished attempts so a fresh QR code can be made.
  const db = createServiceClient();
  const { data: existing } = await db.auth.admin.mfa.listFactors({ userId: profile.id });
  for (const f of existing?.factors ?? []) {
    if (f.status !== "verified") await db.auth.admin.mfa.deleteFactor({ userId: profile.id, id: f.id });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `OncoCare ${profile.user_code} ${Date.now()}`,
    issuer: "OncoCare BMT",
  });
  if (error || !data) return fail(error?.message || "Could not create the QR code", 500);
  return ok({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
}
