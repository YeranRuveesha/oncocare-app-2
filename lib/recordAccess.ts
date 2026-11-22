import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/** Writes "who opened which patient" (and exports). A repeat view within 10 minutes is not written again. */
export async function logAccess(clinicianId: string, patientId: string, hospitalId: string, action: "view" | "export", detail?: string) {
  const db = createServiceClient();
  if (action === "view") {
    const { data } = await db.from("record_access_logs").select("id").eq("clinician_id", clinicianId).eq("patient_id", patientId).eq("action", "view")
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString()).limit(1);
    if (data?.length) return;
  }
  await db.from("record_access_logs").insert({ clinician_id: clinicianId, patient_id: patientId, hospital_id: hospitalId, action, detail: detail ?? null });
}
