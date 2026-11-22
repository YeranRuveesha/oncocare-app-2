import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Active hospitals for the sign-up forms: id + name only. */
export async function GET() {
  const db = createServiceClient();
  const { data } = await db.from("hospitals").select("id, name").eq("status", "active").order("name");
  return NextResponse.json({ hospitals: data ?? [] });
}
