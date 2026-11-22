import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { writeAudit, auditTargetType } from "@/lib/audit";
import { validateNewValue } from "@/lib/changes";
import { findField } from "@/lib/fields";
import { fieldValue, loadFullProfile } from "@/lib/profileData";
import { createServiceClient } from "@/lib/supabase/server";
import { changeRequestSchema } from "@/lib/validation/forms";

/** Ask for a change to a LOCKED field. Saved as "pending"; nothing changes yet. */
export async function POST(req: Request) {
  const g = await guardApi();
  if ("response" in g) return g.response;
  const body = await parseBody(req, changeRequestSchema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  if (me.role === "platform_admin") return fail("Admins edit their own details directly on My Profile", 400);
  const def = findField(me.role, body.data.field);
  if (!def || !def.locked || !def.requestable) return fail("This field cannot be changed by request", 400);

  const db = createServiceClient();
  const { data: open } = await db.from("change_requests").select("id").eq("requester_id", me.id).eq("field_name", def.key).eq("status", "pending").limit(1);
  if (open?.length) return fail("You already have a pending request for this field", 409);

  const v = await validateNewValue(db, me, def, body.data.new_value);
  if (!v.ok) return fail(v.message, 422, { new_value: v.message });
  const fp = (await loadFullProfile(db, me.id))!;
  const oldValue = def.key === "hospital_name" ? fp.hospitalName ?? "" : fieldValue(fp, def.key);
  const newValue = Array.isArray(v.value) ? v.value.join(", ") : v.value;
  if (newValue === oldValue) return fail("The new value is the same as the current one", 422, { new_value: "Same as the current value" });

  const { data, error } = await db
    .from("change_requests")
    .insert({
      requester_id: me.id,
      requester_role: me.role,
      hospital_id: me.hospital_id,
      field_name: def.key,
      old_value: def.key === "assigned_doctor_id" ? fp.patient?.assigned_doctor_id ?? "" : oldValue,
      new_value: newValue,
      reason: body.data.reason,
    })
    .select("id")
    .single();
  if (error) return fail(error.message, 500);
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId: me.hospital_id, action: "change_request.created",
    targetType: auditTargetType(me.role), targetId: me.id, targetLabel: me.user_code,
    newValue: { field: def.key },
  });
  return ok({ id: data.id });
}
