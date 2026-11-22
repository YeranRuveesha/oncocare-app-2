import { fail, guardApi, ok } from "@/lib/api";
import { diff, writeAudit } from "@/lib/audit";
import { removeLogo, storeLogo } from "@/lib/logo";
import { createServiceClient } from "@/lib/supabase/server";
import { hexColorSchema } from "@/lib/validation/common";

/**
 * Hospital Admin changes THEIR hospital's logo and colours. Only the server
 * writes the hospitals table. The hospital NAME is locked: it goes through
 * a change request that the Admin approves.
 */
export async function POST(req: Request) {
  const g = await guardApi(["hospital_admin"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid request");
  const p = hexColorSchema.safeParse(form.get("primary_color"));
  const s = hexColorSchema.safeParse(form.get("secondary_color"));
  if (!p.success || !s.success) return fail("Choose valid colours", 422);

  const db = createServiceClient();
  const { data: before } = await db.from("hospitals").select("*").eq("id", me.hospital_id!).single();
  const patch: Record<string, unknown> = { primary_color: p.data.toUpperCase(), secondary_color: s.data.toUpperCase() };
  const file = form.get("logo");
  if (file && typeof file !== "string" && file.size > 0) {
    const stored = await storeLogo(db, me.hospital_id!, file);
    if (!stored.ok) return fail(stored.message, 422);
    patch.logo_path = stored.path;
  } else if (form.get("remove_logo") === "1") patch.logo_path = null;

  const { error } = await db.from("hospitals").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", me.hospital_id!);
  if (error) return fail(error.message, 500);
  if ("logo_path" in patch && before?.logo_path) await removeLogo(db, before.logo_path);
  const d = diff(before ?? {}, patch);
  if (d.changed) {
    await writeAudit(db, {
      actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id, action: "hospital.branding_updated",
      targetType: "hospital", targetId: me.hospital_id, targetLabel: before?.name, oldValue: d.oldValue, newValue: d.newValue,
    });
  }
  return ok();
}
