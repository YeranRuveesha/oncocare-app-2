import { NextResponse } from "next/server";
import { z } from "zod";
import { ROLE_LABEL, fullName, type Role } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Active, APPROVED doctors of one active hospital: id + display name only. */
export async function GET(req: Request) {
  const hospital = new URL(req.url).searchParams.get("hospital") ?? "";
  if (!z.string().uuid().safeParse(hospital).success) return NextResponse.json({ doctors: [] });
  const db = createServiceClient();
  const { data: h } = await db.from("hospitals").select("status").eq("id", hospital).maybeSingle();
  if (!h || h.status === "deactivated") return NextResponse.json({ doctors: [] });
  const { data } = await db
    .from("profiles")
    .select("id, given_names, last_name, role")
    .eq("hospital_id", hospital)
    .in("role", ["junior_doctor", "senior_consultant"])
    .eq("status", "active")
    .order("last_name");
  return NextResponse.json({
    doctors: (data ?? []).map((d) => ({ id: d.id, name: `Dr ${fullName(d)} (${ROLE_LABEL[d.role as Role]})` })),
  });
}
