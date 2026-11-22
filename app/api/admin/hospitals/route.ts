import { fail, guardApi, ok } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { createHospitalAdmin } from "@/lib/adminOps";
import { checkUnique } from "@/lib/accounts";
import { generateHospitalCode } from "@/lib/ids";
import { storeLogo } from "@/lib/logo";
import { createServiceClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/common";
import { createHospitalSchema } from "@/lib/validation/forms";

/**
 * Admin creates a hospital AND its first Hospital Admin.
 * Returns the Hospital Admin's User ID + temporary password ONCE.
 */
export async function POST(req: Request) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const form = await req.formData().catch(() => null);
  let raw: unknown = null;
  try {
    raw = JSON.parse(String(form?.get("data") ?? "null"));
  } catch {
    return fail("Invalid request");
  }
  const parsed = createHospitalSchema.safeParse(raw);
  if (!parsed.success) return fail("Please fix the highlighted fields", 422, fieldErrors(parsed.error));
  const { hospital: h, admin } = parsed.data;
  const db = createServiceClient();

  // Unique: hospital name + registration number, admin email/phone/NIC.
  const errors: Record<string, string> = {};
  const { data: sameName } = await db.from("hospitals").select("id").ilike("name", h.name).limit(1);
  if (sameName?.length) errors["hospital.name"] = "A hospital with this name already exists";
  const { data: sameReg } = await db.from("hospitals").select("id").ilike("registration_no", h.registration_no).limit(1);
  if (sameReg?.length) errors["hospital.registration_no"] = "This registration number is already used";
  for (const [k, v] of Object.entries(await checkUnique(db, admin))) errors[`admin.${k}`] = v;
  if (Object.keys(errors).length) return fail("Some details are already registered", 422, errors);

  let code = generateHospitalCode();
  for (let i = 0; i < 5; i++) {
    const { data } = await db.from("hospitals").select("id").eq("code", code).limit(1);
    if (!data?.length) break;
    code = generateHospitalCode();
  }
  const { data: created, error } = await db
    .from("hospitals")
    .insert({ ...h, primary_color: h.primary_color.toUpperCase(), secondary_color: h.secondary_color.toUpperCase(), code, created_by: me.id, status: "awaiting_admin_setup" })
    .select("id, name, code")
    .single();
  if (error || !created) return fail("Could not create the hospital: " + error?.message, 500);

  const logo = form?.get("logo");
  if (logo && typeof logo !== "string" && logo.size > 0) {
    const stored = await storeLogo(db, created.id, logo);
    if (!stored.ok) {
      await db.from("hospitals").delete().eq("id", created.id);
      return fail(stored.message, 422, { logo: stored.message });
    }
    await db.from("hospitals").update({ logo_path: stored.path }).eq("id", created.id);
  }

  const r = await createHospitalAdmin(db, me, created, admin, true);
  if (!r.ok) {
    await db.from("hospitals").delete().eq("id", created.id);
    const errs = Object.fromEntries(Object.entries(r.errors).map(([k, v]) => [`admin.${k}`, v]));
    return fail(r.message, 422, errs);
  }
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: created.id, action: "hospital.created", targetType: "hospital",
    targetId: created.id, targetLabel: created.name, newValue: { ...h, code },
  });
  return ok({ hospitalId: created.id, code: created.code, userCode: r.userCode, tempPassword: r.tempPassword });
}
