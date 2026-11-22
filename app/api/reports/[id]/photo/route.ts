import { NextResponse } from "next/server";
import { fail, guardApi } from "@/lib/api";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

// Private photo: a 60-second signed link, only for the patient or a clinician allowed to view the patient (RLS decides).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardApi(["patient", "junior_doctor", "senior_consultant"]);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Not found", 404);
  const supabase = await createUserClient();
  const { data: row } = await supabase.from("symptom_logs").select("photo_path, patient_id").eq("id", id).maybeSingle();
  if (!row?.photo_path) return fail("Not found", 404);
  const { data } = await createServiceClient().storage.from("symptom-photos").createSignedUrl(row.photo_path, 60);
  if (!data?.signedUrl) return fail("Could not open the photo", 500);
  return NextResponse.redirect(data.signedUrl);
}
