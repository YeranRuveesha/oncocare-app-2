import { fail, guardApi, ok } from "@/lib/api";
import { addDays, colomboDate, dayPlus } from "@/lib/dates";
import { createServiceClient } from "@/lib/supabase/server";
import { concerning, dailyLogSchema, FIELD_KEYS } from "@/lib/validation/dailyLog";

async function readBody(req: Request) {
  const raw = await req.json().catch(() => null);
  if (!raw) return { response: fail("Invalid request") };
  const parsed = dailyLogSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "form")] ||= i.message;
    return { response: fail("Please check the highlighted values", 422, errors) };
  }
  return { data: parsed.data };
}

/** New daily log. One per day. Today, or a missed day in the last 3 days (marked "late"). */
export async function POST(req: Request) {
  const g = await guardApi(["patient"]);
  if ("response" in g) return g.response;
  const b = await readBody(req);
  if ("response" in b) return b.response;
  const me = g.session.profile;
  const today = colomboDate();
  const date = b.data.log_date ?? today;
  if (date > today) return fail("You cannot log a day in the future.", 422);
  if (date < addDays(today, -3)) return fail("You can only add a missed day from the last 3 days.", 422);

  const db = createServiceClient();
  const { data: pd } = await db.from("patient_details").select("transplant_date").eq("profile_id", me.id).single();
  const { log_date: _ignored, ...fields } = b.data;
  void _ignored;
  const { data, error } = await db.from("daily_logs").insert({
    ...fields, patient_id: me.id, hospital_id: me.hospital_id, log_date: date, is_late: date < today, day_post_transplant: dayPlus(pd?.transplant_date, date),
  }).select("id").single();
  if (error) return fail(error.code === "23505" ? "You already saved a log for that day. Open it to edit." : "Could not save. Please try again.", error.code === "23505" ? 409 : 500);
  return ok({ id: data.id, concerning: concerning(b.data) });
}

/** Edit a log within 24 hours of first saving it. The old values are kept in daily_log_edits. */
export async function PATCH(req: Request) {
  const g = await guardApi(["patient"]);
  if ("response" in g) return g.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Not found", 404);
  const b = await readBody(req);
  if ("response" in b) return b.response;
  const me = g.session.profile;
  const db = createServiceClient();
  const { data: old } = await db.from("daily_logs").select("*").eq("id", id).eq("patient_id", me.id).maybeSingle();
  if (!old) return fail("Not found", 404);
  if (Date.now() - new Date(old.created_at).getTime() > 24 * 3600_000) return fail("This log is locked. Logs can be edited for 24 hours.", 403);

  const next: Record<string, unknown> = {};
  const before: Record<string, unknown> = {};
  for (const k of FIELD_KEYS) {
    const nv = (b.data as Record<string, unknown>)[k] ?? null;
    if (JSON.stringify(nv) !== JSON.stringify(old[k] ?? null)) { next[k] = nv; before[k] = old[k] ?? null; }
  }
  if (!Object.keys(next).length) return ok({ concerning: concerning(b.data), unchanged: true });
  const { error } = await db.from("daily_logs").update(next).eq("id", id);
  if (error) return fail(/locked/.test(error.message) ? "This log is locked. Logs can be edited for 24 hours." : "Could not save. Please try again.", /locked/.test(error.message) ? 403 : 500);
  await db.from("daily_log_edits").insert({ log_id: id, patient_id: me.id, old_values: before, new_values: next });
  return ok({ concerning: concerning(b.data) });
}
