import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

/** Links in Supabase emails (password reset) land here. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextParam = url.searchParams.get("next") || "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (tokenHash && type === "recovery") {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (!error) {
      const res = NextResponse.redirect(new URL(next, req.url));
      // Marks this browser as allowed to set a new password for 15 minutes.
      res.cookies.set("oc_recovery", "1", { httpOnly: true, sameSite: "lax", maxAge: 900, path: "/" });
      return res;
    }
  }
  return NextResponse.redirect(new URL("/forgot-password?error=link", req.url));
}
