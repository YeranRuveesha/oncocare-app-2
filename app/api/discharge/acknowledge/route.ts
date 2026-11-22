import { z } from "zod";
import { fail, guardApi, ok, parseBody } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/server";
import { loadActiveDischarge } from "@/lib/discharge";

// The patient confirms they have read the CURRENT instructions of their hospital.
export async function POST(req: Request) {
  const g = await guardApi(["patient"]);
  if ("response" in g) return g.response;
  const parsed = await parseBody(req, z.object({ instruction_id: z.string().uuid() }));
  if ("response" in parsed) return parsed.response;
  const me = g.session.profile;
  const doc = await loadActiveDischarge(me.hospital_id);
  if (!doc || doc.id !== parsed.data.instruction_id) return fail("These instructions have changed. Please reload the page and read them again.", 409);
  const { error } = await createServiceClient().from("discharge_acknowledgements").upsert(
    { patient_id: me.id, instruction_id: doc.id, version: doc.version, confirmed_at: new Date().toISOString() },
    { onConflict: "patient_id,instruction_id", ignoreDuplicates: true },
  );
  if (error) return fail("Could not save. Please try again.", 500);
  return ok();
}
