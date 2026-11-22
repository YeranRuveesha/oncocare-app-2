import { fail, guardApi, ok } from "@/lib/api";
import { createUserClient } from "@/lib/supabase/server";
import { sendPhoneCode } from "@/lib/verify";
import { createServiceClient } from "@/lib/supabase/server";

/** After approval: send a code to the NEW email / phone. The old one keeps working until verified. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi();
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const db = createServiceClient();
  const { data: cr } = await db.from("change_requests").select("*").eq("id", id).eq("requester_id", g.session.userId).maybeSingle();
  if (!cr || cr.status !== "approved" || cr.applied_at || !["email", "phone"].includes(cr.field_name)) return fail("Nothing to verify", 400);

  if (cr.field_name === "email") {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.updateUser({ email: cr.new_value });
    if (error) return fail(/rate|seconds/i.test(error.message) ? "Please wait a moment before asking for another code." : error.message, 400);
    return ok();
  }
  const err = await sendPhoneCode(g.session.userId, cr.new_value);
  return err ? fail(err, 400) : ok();
}
