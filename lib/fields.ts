// Every profile field, per role: label, where it is stored, whether it is LOCKED
// (change only through a change request) and how a new value is validated.
import { z } from "zod";
import { DIAGNOSES, GENDERS, QUALIFICATIONS, RELATIONSHIPS, SPECIALTIES, TRANSPLANT_TYPES } from "@/lib/options";
import { isClinician, type Role } from "@/lib/roles";
import { emailSchema, nicSchema, pastDateSchema, phoneSchema, requiredText, slmcSchema } from "@/lib/validation/common";

export type FieldSource = "profile" | "patient" | "clinician" | "hospital";
export type FieldKind = "text" | "email" | "phone" | "nic" | "date" | "select" | "multi" | "number" | "doctor";

export interface FieldDef {
  key: string;
  label: string;
  source: FieldSource;
  column: string;
  kind: FieldKind;
  options?: readonly string[];
  /** true = compulsory: read-only, change only by request */
  locked: boolean;
  /** false = can never be changed (User ID) or is moved by staff only (hospital) */
  requestable: boolean;
  schema?: z.ZodTypeAny;
  /** For "Other" options: the column holding the typed text */
  otherColumn?: string;
}

const name = (key: "last_name" | "given_names", label: string): FieldDef => ({
  key, label, source: "profile", column: key, kind: "text", locked: true, requestable: true, schema: requiredText(label),
});

const PERSON: FieldDef[] = [
  { key: "user_code", label: "User ID", source: "profile", column: "user_code", kind: "text", locked: true, requestable: false },
  name("last_name", "Last name"),
  name("given_names", "Given name/s"),
  { key: "email", label: "Email address", source: "profile", column: "email", kind: "email", locked: true, requestable: true, schema: emailSchema },
  { key: "phone", label: "Telephone number", source: "profile", column: "phone", kind: "phone", locked: true, requestable: true, schema: phoneSchema },
  { key: "nic", label: "NIC number", source: "profile", column: "nic", kind: "nic", locked: true, requestable: true, schema: nicSchema },
];

const HOSPITAL: FieldDef = { key: "hospital", label: "Hospital", source: "hospital", column: "name", kind: "text", locked: true, requestable: false };

const PATIENT: FieldDef[] = [
  ...PERSON,
  HOSPITAL,
  { key: "assigned_doctor_id", label: "Assigned doctor", source: "patient", column: "assigned_doctor_id", kind: "doctor", locked: true, requestable: true, schema: z.string().uuid("Choose a doctor") },
  { key: "transplant_date", label: "Transplant date", source: "patient", column: "transplant_date", kind: "date", locked: true, requestable: true, schema: pastDateSchema("Transplant date") },
  { key: "diagnosis", label: "Diagnosis", source: "patient", column: "diagnosis", kind: "select", options: DIAGNOSES, locked: true, requestable: true, schema: z.enum(DIAGNOSES) },
  { key: "diagnosis_other", label: "Diagnosis (other)", source: "patient", column: "diagnosis_other", kind: "text", locked: false, requestable: false, schema: z.string().trim().max(120) },
  { key: "transplant_type", label: "Transplant type", source: "patient", column: "transplant_type", kind: "select", options: TRANSPLANT_TYPES, locked: true, requestable: true, schema: z.enum(TRANSPLANT_TYPES) },
  { key: "date_of_birth", label: "Date of birth", source: "patient", column: "date_of_birth", kind: "date", locked: true, requestable: true, schema: pastDateSchema("Date of birth") },
  { key: "gender", label: "Gender", source: "patient", column: "gender", kind: "select", options: GENDERS, locked: true, requestable: true, schema: z.enum(GENDERS) },
  { key: "ec_name", label: "Emergency contact name", source: "patient", column: "ec_name", kind: "text", locked: true, requestable: true, schema: requiredText("Emergency contact name") },
  { key: "ec_relationship", label: "Emergency contact relationship", source: "patient", column: "ec_relationship", kind: "select", options: RELATIONSHIPS, otherColumn: "ec_relationship_other", locked: true, requestable: true, schema: z.enum(RELATIONSHIPS) },
  { key: "ec_phone", label: "Emergency contact phone", source: "patient", column: "ec_phone", kind: "phone", locked: true, requestable: true, schema: phoneSchema },
];

const CLINICIAN: FieldDef[] = [
  ...PERSON,
  HOSPITAL,
  { key: "role", label: "Clinician role", source: "profile", column: "role", kind: "select", options: ["junior_doctor", "senior_consultant"], locked: true, requestable: true, schema: z.enum(["junior_doctor", "senior_consultant"]) },
  { key: "slmc_no", label: "SLMC registration number", source: "clinician", column: "slmc_no", kind: "text", locked: true, requestable: true, schema: slmcSchema },
  { key: "qualifications", label: "Qualifications", source: "clinician", column: "qualifications", kind: "multi", options: QUALIFICATIONS, locked: true, requestable: true, schema: z.array(z.string().trim().min(2).max(60)).min(1, "Choose at least one").max(10) },
  { key: "specialty", label: "Specialty", source: "clinician", column: "specialty", kind: "select", options: SPECIALTIES, otherColumn: "specialty_other", locked: true, requestable: true, schema: z.enum(SPECIALTIES) },
  { key: "department", label: "Department / Unit", source: "clinician", column: "department", kind: "text", locked: false, requestable: false, schema: z.string().trim().max(120) },
  { key: "years_experience", label: "Years of experience", source: "clinician", column: "years_experience", kind: "number", locked: false, requestable: false, schema: z.union([z.literal(""), z.coerce.number().int().min(0, "0 to 60").max(60, "0 to 60")]) },
];

const HOSPITAL_ADMIN: FieldDef[] = [
  ...PERSON,
  HOSPITAL,
  { key: "job_title", label: "Job title", source: "profile", column: "job_title", kind: "text", locked: true, requestable: true, schema: requiredText("Job title", 80) },
  { key: "staff_id", label: "Staff / employee ID", source: "profile", column: "staff_id", kind: "text", locked: false, requestable: false, schema: z.string().trim().max(40) },
];

const ADMIN: FieldDef[] = [...PERSON];

export function fieldsForRole(role: Role): FieldDef[] {
  if (role === "patient") return PATIENT;
  if (isClinician(role)) return CLINICIAN;
  if (role === "hospital_admin") return HOSPITAL_ADMIN;
  return ADMIN;
}

/** The Hospital Admin may ask the Admin to rename their hospital. */
export const HOSPITAL_NAME_FIELD: FieldDef = {
  key: "hospital_name", label: "Hospital name", source: "hospital", column: "name", kind: "text", locked: true, requestable: true,
  schema: z.string().trim().min(3, "3 to 100 characters").max(100, "3 to 100 characters"),
};

export function findField(role: Role, key: string): FieldDef | undefined {
  if (key === "hospital_name" && role === "hospital_admin") return HOSPITAL_NAME_FIELD;
  return fieldsForRole(role).find((f) => f.key === key);
}

/** Values with an "Other" option are sent as "Other: typed text". */
export function splitOther(value: string): { value: string; other: string | null } {
  const m = /^Other:\s*(.+)$/.exec(value);
  return m ? { value: "Other", other: m[1].trim() } : { value, other: null };
}
