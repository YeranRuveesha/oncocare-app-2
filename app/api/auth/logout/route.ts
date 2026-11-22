import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createUserClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
