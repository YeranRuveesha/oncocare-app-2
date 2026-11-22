import "server-only";
import type { ServiceClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/roles";
import type { Profile } from "@/lib/session";

export interface PatientDetails {
  profile_id: string;
  assigned_doctor_id: string;
  transplant_date: string;
  diagnosis: string;
  diagnosis_other: string | null;
  transplant_type: string;
  date_of_birth: string;
  gender: string;
  ec_name: string;
  ec_relationship: string;
  ec_relationship_other: string | null;
  ec_phone: string;
}

export interface ClinicianDetails {
  profile_id: string;
  slmc_no: string;
  qualifications: string[];
  specialty: string;
  specialty_other: string | null;
  department: string | null;
  years_experience: number | null;
}

export interface FullProfile {
  profile: Profile;
  patient: PatientDetails | null;
  clinician: ClinicianDetails | null;
  hospitalName: string | null;
  doctorName: string | null;
}

/** Loads one person's complete record. Call only AFTER checking the viewer may see it. */
export async function loadFullProfile(db: ServiceClient, id: string): Promise<FullProfile | null> {
  const { data: profile } = await db.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!profile) return null;
  const [{ data: patient }, { data: clinician }, { data: hospital }] = await Promise.all([
    db.from("patient_details").select("*").eq("profile_id", id).maybeSingle<PatientDetails>(),
    db.from("clinician_details").select("*").eq("profile_id", id).maybeSingle<ClinicianDetails>(),
    profile.hospital_id
      ? db.from("hospitals").select("name").eq("id", profile.hospital_id).maybeSingle<{ name: string }>()
      : Promise.resolve({ data: null }),
  ]);
  let doctorName: string | null = null;
  if (patient?.assigned_doctor_id) {
    const { data: doc } = await db.from("profiles").select("given_names, last_name").eq("id", patient.assigned_doctor_id).maybeSingle();
    if (doc) doctorName = `Dr ${fullName(doc)}`;
  }
  return { profile, patient: patient ?? null, clinician: clinician ?? null, hospitalName: hospital?.name ?? null, doctorName };
}

/** Value of a field as text, for showing and for change-request "old value". */
export function fieldValue(fp: FullProfile, key: string): string {
  const p = fp.profile as unknown as Record<string, unknown>;
  const pd = (fp.patient ?? {}) as unknown as Record<string, unknown>;
  const cd = (fp.clinician ?? {}) as unknown as Record<string, unknown>;
  switch (key) {
    case "hospital":
      return fp.hospitalName ?? "";
    case "assigned_doctor_id":
      return fp.doctorName ?? "";
    case "ec_relationship":
      return pd.ec_relationship === "Other" ? `Other: ${pd.ec_relationship_other ?? ""}` : String(pd.ec_relationship ?? "");
    case "specialty":
      return cd.specialty === "Other" ? `Other: ${cd.specialty_other ?? ""}` : String(cd.specialty ?? "");
    case "qualifications":
      return ((cd.qualifications as string[]) ?? []).join(", ");
    default: {
      const v = key in p ? p[key] : key in pd ? pd[key] : cd[key];
      return v === null || v === undefined ? "" : String(v);
    }
  }
}

/** "Day +14" after the transplant date. */
export function daysSinceTransplant(transplantDate: string | null | undefined): number | null {
  if (!transplantDate) return null;
  const start = new Date(transplantDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000));
}
