import { NextResponse } from "next/server";
import { fail, guardApi } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/server";
import { createUserClient } from "@/lib/supabase/server";

// Private PDF: the browser only ever gets a 60-second signed link, after we checked the person may read it (RLS).
export async function GET(req: Request) {
  const g = await guardApi(["patient", "junior_doctor", "senior_consultant", "hospital_admin"]);
  if ("response" in g) return g.response;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Not found", 404);
  const supabase = await createUserClient();
  const { data: doc } = await supabase.from("discharge_instructions").select("pdf_path").eq("id", id).maybeSingle();
  if (!doc?.pdf_path) return fail("No PDF for these instructions", 404);
  const { data } = await createServiceClient().storage.from("discharge-docs").createSignedUrl(doc.pdf_path, 60, { download: "discharge-instructions.pdf" });
  if (!data?.signedUrl) return fail("Could not open the PDF", 500);
  return NextResponse.redirect(data.signedUrl);
}
