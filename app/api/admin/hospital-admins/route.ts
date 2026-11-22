import { z } from "zod";
import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { createHospitalAdmin } from "@/lib/adminOps";
import { createServiceClient } from "@/lib/supabase/server";
import { hospitalAdminSchema } from "@/lib/validation/forms";

const schema = hospitalAdminSchema.extend({ hospital_id: z.string().uuid() });

/** Admin adds ANOTHER Hospital Admin to a hospital (temporary credentials shown once). */
export async function POST(req: Request) {
  const g = await guardApi(["platform_admin"]);
  if ("response" in g) return g.response;
  const body = await parseBody(req, schema);
  if ("response" in body) return body.response;
  const db = createServiceClient();
  const { data: h } = await db.from("hospitals").select("id, name, status").eq("id", body.data.hospital_id).maybeSingle();
  if (!h) return fail("Hospital not found", 404);
  if (h.status === "deactivated") return fail("Reactivate the hospital first", 409);
  const { hospital_id: _ignored, ...person } = body.data;
  void _ignored;
  const r = await createHospitalAdmin(db, g.session.profile, h, person, false);
  if (!r.ok) return fail(r.message, 422, r.errors);
  return ok({ userCode: r.userCode, tempPassword: r.tempPassword });
}
