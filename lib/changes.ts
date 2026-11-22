import "server-only";
import { checkUnique, isActiveDoctorOf, revokeSessions } from "@/lib/accounts";
import { findField, splitOther, type FieldDef } from "@/lib/fields";
import type { ServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/session";

/** Validates a requested new value against the field's shared rules. Returns the clean value or an error. */
export async function validateNewValue(
  db: ServiceClient,
  requester: Profile,
  def: FieldDef,
  raw: string | string[],
): Promise<{ ok: true; value: string | string[] } | { ok: false; message: string }> {
  let value: string | string[] = raw;
  let other: string | null = null;
  if (typeof raw === "string" && def.otherColumn) {
    const s = splitOther(raw);
    value = s.value;
    other = s.other;
    if (value === "Other" && !other) return { ok: false, message: "Please type the value" };
  }
  if (def.kind === "multi" && !Array.isArray(value)) value = String(value).split(",").map((x) => x.trim()).filter(Boolean);
  if (def.kind !== "multi" && Array.isArray(value)) return { ok: false, message: "Not valid" };
  const parsed = def.schema?.safeParse(value);
  if (parsed && !parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Not valid" };
  const clean = (parsed?.data ?? value) as string | string[];

  if (["email", "phone", "nic", "slmc_no"].includes(def.key)) {
    const dup = await checkUnique(db, { [def.key]: clean as string }, requester.id);
    if (Object.keys(dup).length) return { ok: false, message: Object.values(dup)[0] };
  }
  if (def.key === "assigned_doctor_id" && !(await isActiveDoctorOf(db, String(clean), requester.hospital_id ?? ""))) {
    return { ok: false, message: "Choose an approved doctor from your hospital" };
  }
  if (def.key === "hospital_name" && requester.hospital_id) {
    const { data } = await db.from("hospitals").select("id").ilike("name", String(clean)).neq("id", requester.hospital_id).limit(1);
    if (data?.length) return { ok: false, message: "Another hospital already has this name" };
  }
  if (other) return { ok: true, value: `Other: ${other}` };
  return { ok: true, value: clean };
}

/** Writes an approved change with the SERVICE role (users can never write locked columns themselves). */
export async function applyChange(db: ServiceClient, requester: Profile, fieldKey: string, stored: string) {
  const def = findField(requester.role, fieldKey);
  if (!def) throw new Error("Unknown field");
  let value: unknown = stored;
  let other: string | null = null;
  if (def.otherColumn) ({ value, other } = splitOther(stored));
  if (def.kind === "multi") value = stored.split(",").map((x) => x.trim()).filter(Boolean);

  const patch: Record<string, unknown> = { [def.column]: value };
  if (def.otherColumn) patch[def.otherColumn] = value === "Other" ? other : null;

  if (def.source === "profile") {
    const { error } = await db.from("profiles").update(patch).eq("id", requester.id);
    if (error) throw new Error(error.message);
  } else if (def.source === "patient") {
    const { error } = await db.from("patient_details").update(patch).eq("profile_id", requester.id);
    if (error) throw new Error(error.message);
  } else if (def.source === "clinician") {
    const { error } = await db.from("clinician_details").update(patch).eq("profile_id", requester.id);
    if (error) throw new Error(error.message);
  } else if (def.key === "hospital_name" && requester.hospital_id) {
    const { error } = await db.from("hospitals").update({ name: value }).eq("id", requester.hospital_id);
    if (error) throw new Error(error.message);
  }
  if (def.key !== "hospital_name") await revokeSessions(db, requester.id);
}

/** Who may review this request? (Same rules as the RLS policies.) */
export function canReview(
  reviewer: Profile,
  req: { requester_id: string; requester_role: string; hospital_id: string | null },
): boolean {
  if (req.requester_id === reviewer.id) return false; // nobody approves their own request
  if (reviewer.role === "hospital_admin") {
    return req.hospital_id === reviewer.hospital_id && ["patient", "junior_doctor", "senior_consultant"].includes(req.requester_role);
  }
  if (reviewer.role === "platform_admin") {
    return req.requester_role === "hospital_admin" || req.requester_role === "platform_admin";
  }
  return false;
}
