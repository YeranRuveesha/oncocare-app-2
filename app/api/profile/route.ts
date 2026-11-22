import { z } from "zod";
import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { findField } from "@/lib/fields";
import { createUserClient } from "@/lib/supabase/server";

const schema = z.object({ field: z.string(), value: z.string().max(200) });

/**
 * OPTIONAL fields are changed straight away (no approval): diagnosis other,
 * department/unit, years of experience, staff ID. Written with the user's OWN
 * session: the database only allows these columns (column grants + RLS).
 */
export async function PATCH(req: Request) {
  const g = await guardApi();
  if ("response" in g) return g.response;
  const body = await parseBody(req, schema);
  if ("response" in body) return body.response;
  const me = g.session.profile;
  const def = findField(me.role, body.data.field);
  if (!def || def.locked || def.requestable) return fail("This field cannot be edited here", 400);
  const parsed = def.schema?.safeParse(body.data.value);
  if (parsed && !parsed.success) return fail(parsed.error.issues[0]?.message ?? "Not valid", 422);
  const value = body.data.value.trim() === "" ? null : def.kind === "number" ? Number(body.data.value) : body.data.value.trim();

  const supabase = await createUserClient();
  if (def.source === "patient") {
    const { error } = await supabase.from("patient_details").update({ [def.column]: value }).eq("profile_id", me.id);
    if (error) return fail(error.message, 403);
  } else if (def.source === "clinician") {
    const { error } = await supabase.from("clinician_details").update({ [def.column]: value }).eq("profile_id", me.id);
    if (error) return fail(error.message, 403);
  } else if (def.key === "staff_id") {
    // staff_id has no user column grant, so the server writes it after the checks above.
    const { createServiceClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceClient().from("profiles").update({ staff_id: value }).eq("id", me.id);
    if (error) return fail(error.message, 500);
  } else return fail("Not allowed", 400);
  return ok();
}
