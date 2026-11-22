import "server-only";
import { createUserClient } from "@/lib/supabase/server";

export interface DischargeSection {
  id: string;
  title: string;
  type?: "warning";
  items: string[];
}
export interface DischargeDoc {
  id: string;
  hospital_id: string | null;
  version: number;
  title: string;
  sections: DischargeSection[];
  pdf_path: string | null;
  is_active: boolean;
  updated_at: string;
}

/** The instructions that apply to the current user: their hospital's active version, else the platform default. RLS limits what can be read. */
export async function loadActiveDischarge(hospitalId: string | null): Promise<DischargeDoc | null> {
  const supabase = await createUserClient();
  const { data } = await supabase.from("discharge_instructions").select("*").eq("is_active", true);
  const docs = (data ?? []) as DischargeDoc[];
  return docs.find((d) => d.hospital_id === hospitalId && hospitalId) ?? docs.find((d) => d.hospital_id === null) ?? null;
}
