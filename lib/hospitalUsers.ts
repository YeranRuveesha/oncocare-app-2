import "server-only";
import { isClinician, type Role } from "@/lib/roles";
import type { Profile } from "@/lib/session";
import type { ServiceClient } from "@/lib/supabase/server";

export type PersonKind = "patients" | "clinicians";

export function kindOf(role: Role): PersonKind | null {
  if (role === "patient") return "patients";
  if (isClinician(role)) return "clinicians";
  return null;
}

/** A patient or clinician of the Hospital Admin's OWN hospital (never another admin, never themselves). */
export async function loadManagedPerson(db: ServiceClient, admin: Profile, id: string): Promise<Profile | null> {
  if (id === admin.id) return null;
  const { data } = await db.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!data || data.hospital_id !== admin.hospital_id || !kindOf(data.role)) return null;
  return data;
}
