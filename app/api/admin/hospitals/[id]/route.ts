import { fail, guardApi, ok } from "@/lib/api";
import { diff, writeAudit } from "@/lib/audit";
import { removeLogo, storeLogo } from "@/lib/logo";
import { createServiceClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/common";
import { hospitalSchema } from "@/lib/validation/forms";

/** Admin EDITS any hospital detail, including logo and colours. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  const form = await req.formData().catch(() => null);
  let raw: unknown = null;
  try {
    raw = JSON.parse(String(form?.get("data") ?? "null"));
  } catch {
    return fail("Invalid request");
  }
  const parsed = hospitalSchema.safeParse(raw);
  if (!parsed.success) return fail("Please fix the highlighted fields", 422, fieldErrors(parsed.error));
  const h = parsed.data;
  const db = createServiceClient();
  const { data: before } = await db.from("hospitals").select("*").eq("id", id).maybeSingle();
  if (!before) return fail("Not found", 404);

  const errors: Record<string, string> = {};
  const { data: sameName } = await db.from("hospitals").select("id").ilike("name", h.name).neq("id", id).limit(1);
  if (sameName?.length) errors.name = "A hospital with this name already exists";
  const { data: sameReg } = await db.from("hospitals").select("id").ilike("registration_no", h.registration_no).neq("id", id).limit(1);
  if (sameReg?.length) errors.registration_no = "This registration number is already used";
  if (Object.keys(errors).length) return fail("Some details are already registered", 422, errors);

  const patch: Record<string, unknown> = { ...h, primary_color: h.primary_color.toUpperCase(), secondary_color: h.secondary_color.toUpperCase() };
  const logo = form?.get("logo");
  if (logo && typeof logo !== "string" && logo.size > 0) {
    const stored = await storeLogo(db, id, logo);
    if (!stored.ok) return fail(stored.message, 422, { logo: stored.message });
    patch.logo_path = stored.path;
  } else if (form?.get("remove_logo") === "1") patch.logo_path = null;

  const { error } = await db.from("hospitals").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail(error.message, 500);
  if ("logo_path" in patch && before.logo_path) await removeLogo(db, before.logo_path);
  const d = diff(before, patch);
  if (d.changed) {
    await writeAudit(db, {
      actorId: me.id, actorRole: me.role, hospitalId: id, action: "hospital.edited", targetType: "hospital",
      targetId: id, targetLabel: h.name, oldValue: d.oldValue, newValue: d.newValue,
    });
  }
  return ok();
}
