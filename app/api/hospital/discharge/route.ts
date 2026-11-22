import { fail, guardApi, ok } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { dischargeSchema } from "@/lib/validation/discharge";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_PDF = 10 * 1024 * 1024;

/**
 * Hospital Admin publishes a NEW version of their hospital's discharge instructions.
 * Old versions are kept (is_active = false). Patients must confirm the new version again.
 */
export async function POST(req: Request) {
  const g = await guardApi(["hospital_admin"]);
  if ("response" in g) return g.response;
  const me = g.session.profile;
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid request");
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("payload") ?? "")); } catch { return fail("Invalid request"); }
  const parsed = dischargeSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form", 422);

  const db = createServiceClient();
  // Optional PDF (checked by its first bytes, not its name).
  let pdfPath: string | null = null;
  const file = form.get("pdf");
  const hospitalId = me.hospital_id!;
  const { data: latest } = await db.from("discharge_instructions").select("id, version, pdf_path").eq("hospital_id", hospitalId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (latest?.version ?? 0) + 1;
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_PDF) return fail("The PDF is larger than 10 MB.", 422);
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.subarray(0, 5).toString("ascii") !== "%PDF-") return fail("That file is not a PDF.", 422);
    pdfPath = `${hospitalId}/v${version}-${Date.now()}.pdf`;
    const up = await db.storage.from("discharge-docs").upload(pdfPath, buf, { contentType: "application/pdf", upsert: false });
    if (up.error) return fail("Could not store the PDF.", 500);
  } else if (form.get("keep_pdf") === "1") pdfPath = latest?.pdf_path ?? null;

  // Switch the old active version off, then insert the new one (unique index allows one active).
  await db.from("discharge_instructions").update({ is_active: false }).eq("hospital_id", hospitalId).eq("is_active", true);
  const { data: row, error } = await db.from("discharge_instructions").insert({
    hospital_id: hospitalId, version, title: parsed.data.title, sections: parsed.data.sections, pdf_path: pdfPath, is_active: true, updated_by: me.id,
  }).select("id").single();
  if (error || !row) {
    if (latest) await db.from("discharge_instructions").update({ is_active: true }).eq("id", latest.id);
    return fail("Could not save the instructions.", 500);
  }
  await writeAudit(db, {
    actorId: me.id, actorRole: me.role, hospitalId, action: "discharge.published", targetType: "discharge_instructions", targetId: row.id,
    targetLabel: `Version ${version}`, oldValue: { version: latest?.version ?? "platform default" }, newValue: { version, title: parsed.data.title, sections: parsed.data.sections.length, pdf: Boolean(pdfPath) },
  });
  return ok({ version });
}
