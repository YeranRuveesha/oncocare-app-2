import { fail, guardApi, ok } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { kindOf, loadManagedPerson } from "@/lib/hospitalUsers";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

/** Hospital Admin removes a patient's/clinician's photo (Storage RLS allows only their own hospital). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["hospital_admin"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const { id } = await ctx.params;
  const db = createServiceClient();
  const person = await loadManagedPerson(db, me, id);
  if (!person || !person.photo_path) return fail("Not found", 404);
  const supabase = await createUserClient();
  const { data, error } = await supabase.storage.from("profile-photos").remove([person.photo_path]);
  if (error || !data?.length) return fail("Could not remove the photo", 403);
  await db.from("profiles").update({ photo_path: null }).eq("id", id);
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id, action: "user.photo_removed",
    targetType: kindOf(person.role) === "patients" ? "patient" : "clinician", targetId: id, targetLabel: person.user_code,
  });
  return ok();
}
