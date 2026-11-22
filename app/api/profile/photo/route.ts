import { fail, guardApi, ok } from "@/lib/api";
import { processPhoto } from "@/lib/photo";
import { createUserClient } from "@/lib/supabase/server";

/**
 * Upload/replace or remove MY photo. Uses the user's own session, so the
 * Storage RLS rule "only your own folder" is what allows it.
 * The photo is optional, so no approval is needed.
 */
export async function POST(req: Request) {
  const g = await guardApi();
  if ("response" in g) return g.response;
  const form = await req.formData().catch(() => null);
  const result = await processPhoto((form?.get("file") as File | null) ?? null);
  if (!result.ok) return fail(result.message, 422);

  const supabase = await createUserClient();
  const path = `${g.session.userId}/avatar.webp`;
  const { error } = await supabase.storage.from("profile-photos").upload(path, result.data, { contentType: "image/webp", upsert: true });
  if (error) return fail("Upload failed: " + error.message, 500);
  const { error: e2 } = await supabase.from("profiles").update({ photo_path: path }).eq("id", g.session.userId);
  if (e2) return fail("Could not save: " + e2.message, 500);
  return ok();
}

export async function DELETE() {
  const g = await guardApi();
  if ("response" in g) return g.response;
  const supabase = await createUserClient();
  const path = `${g.session.userId}/avatar.webp`;
  await supabase.storage.from("profile-photos").remove([path]);
  await supabase.from("profiles").update({ photo_path: null }).eq("id", g.session.userId);
  return ok();
}
