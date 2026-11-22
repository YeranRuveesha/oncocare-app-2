import { z } from "zod";
import {
  CLINICIAN_ROLE_OPTIONS, DIAGNOSES, GENDERS, HOSPITAL_TYPES, RELATIONSHIPS, SPECIALTIES, TRANSPLANT_TYPES,
} from "@/lib/options";
import {
  emailSchema, hexColorSchema, nicSchema, optionalText, otpSchema, passwordSchema, pastDateSchema, phoneSchema,
  reasonSchema, requiredText, slmcSchema, uuidSchema,
} from "./common";

// ONE schema per form, used by the browser (errors under fields) AND the server (never trust the browser).

const pick = <T extends readonly string[]>(values: T, label: string) =>
  z.enum(values as unknown as [string, ...string[]], {
    errorMap: () => ({ message: `${label} is required` }),
  });

// Fields every person has.
export const personFields = {
  last_name: requiredText("Last name", 80),
  given_names: requiredText("Given name/s", 120),
  email: emailSchema,
  phone: phoneSchema,
  nic: nicSchema,
};

const passwordFields = {
  password: passwordSchema,
  confirm_password: z.string().min(1, "Please confirm the password"),
};

function passwordsMatch(v: { password: string; confirm_password: string }, ctx: z.RefinementCtx) {
  if (v.password !== v.confirm_password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirm_password"], message: "Passwords do not match" });
  }
}

// ── Patient ────────────────────────────────────────────────────────────────
export const patientMedicalFields = {
  hospital_id: uuidSchema,
  assigned_doctor_id: uuidSchema,
  transplant_date: pastDateSchema("Transplant date"),
  diagnosis: pick(DIAGNOSES, "Diagnosis"),
  diagnosis_other: optionalText(120),
  transplant_type: pick(TRANSPLANT_TYPES, "Transplant type"),
  date_of_birth: pastDateSchema("Date of birth"),
  gender: pick(GENDERS, "Gender"),
  ec_name: requiredText("Emergency contact name", 120),
  ec_relationship: pick(RELATIONSHIPS, "Relationship"),
  ec_relationship_other: optionalText(60),
  ec_phone: phoneSchema,
};

function patientRules(
  v: { phone: string; ec_phone: string; transplant_date: string; date_of_birth: string; ec_relationship: string; ec_relationship_other?: string },
  ctx: z.RefinementCtx,
) {
  if (v.phone && v.ec_phone && v.phone === v.ec_phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ec_phone"], message: "Must be different from the patient's own number" });
  }
  if (v.transplant_date && v.date_of_birth && v.transplant_date <= v.date_of_birth) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["transplant_date"], message: "Transplant date must be after the date of birth" });
  }
  if (v.ec_relationship === "Other" && !v.ec_relationship_other) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ec_relationship_other"], message: "Please type the relationship" });
  }
}

export const patientSignupSchema = z
  .object({ ...personFields, ...passwordFields, ...patientMedicalFields })
  .superRefine((v, ctx) => {
    passwordsMatch(v, ctx);
    patientRules(v, ctx);
  });

/** Hospital Admin creates/edits a patient: same fields, no password, hospital is the admin's own. */
export const patientAdminSchema = z
  .object({ ...personFields, ...patientMedicalFields, hospital_id: uuidSchema.optional() })
  .superRefine(patientRules);

// ── Clinician ──────────────────────────────────────────────────────────────
export const clinicianProfessionalFields = {
  hospital_id: uuidSchema,
  clinician_role: z.enum(["junior_doctor", "senior_consultant"], {
    errorMap: () => ({ message: "Clinician role is required" }),
  }),
  slmc_no: slmcSchema,
  qualifications: z
    .array(z.string().trim().min(2, "Too short").max(60, "Too long"))
    .min(1, "Choose at least one qualification")
    .max(10, "Up to 10 qualifications"),
  specialty: pick(SPECIALTIES, "Specialty"),
  specialty_other: optionalText(80),
  department: optionalText(120),
  years_experience: z
    .union([z.literal(""), z.coerce.number().int("Whole years only").min(0, "0 to 60").max(60, "0 to 60")])
    .optional()
    .transform((v): number | undefined => (v === "" || v === undefined ? undefined : v)),
};

function clinicianRules(v: { specialty: string; specialty_other?: string }, ctx: z.RefinementCtx) {
  if (v.specialty === "Other" && !v.specialty_other) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["specialty_other"], message: "Please type the specialty" });
  }
}

export const clinicianSignupSchema = z
  .object({ ...personFields, ...passwordFields, ...clinicianProfessionalFields })
  .superRefine((v, ctx) => {
    passwordsMatch(v, ctx);
    clinicianRules(v, ctx);
  });

export const clinicianAdminSchema = z
  .object({ ...personFields, ...clinicianProfessionalFields, hospital_id: uuidSchema.optional() })
  .superRefine(clinicianRules);

export const CLINICIAN_ROLE_VALUES = CLINICIAN_ROLE_OPTIONS.map((o) => o.value);

// ── Hospital Admin and Admin accounts ─────────────────────────────────────
export const hospitalAdminSchema = z.object({
  ...personFields,
  job_title: requiredText("Job title", 80),
  staff_id: optionalText(40),
});

export const adminInviteSchema = z.object({ ...personFields });

// ── Hospitals ─────────────────────────────────────────────────────────────
export const hospitalSchema = z.object({
  name: z.string().trim().min(3, "3 to 100 characters").max(100, "3 to 100 characters"),
  short_name: requiredText("Short name", 20).refine((v) => v.length >= 2, "At least 2 characters"),
  registration_no: requiredText("Registration / licence number", 50),
  type: pick(HOSPITAL_TYPES, "Hospital type"),
  address_line: requiredText("Address line", 200),
  city: requiredText("City", 80),
  district: requiredText("District", 80),
  country: requiredText("Country", 80),
  email: emailSchema,
  phone: phoneSchema,
  primary_color: hexColorSchema,
  secondary_color: hexColorSchema,
});

export const createHospitalSchema = z.object({
  hospital: hospitalSchema,
  admin: hospitalAdminSchema,
});

// ── Login, verification, passwords ────────────────────────────────────────
export const loginSchema = z.object({
  card: z.enum(["patient", "clinician", "hospital-admin", "admin"]),
  identifier: z.string().trim().min(1, "Enter your email, telephone number or User ID").max(254),
  password: z.string().min(1, "Password is required").max(64),
});

export const activateSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your User ID or email").max(254),
  password: z.string().min(1, "Enter the temporary password").max(64),
});

export const newPasswordSchema = z
  .object({ ...passwordFields, current_password: z.string().max(64).optional() })
  .superRefine((v, ctx) => {
    passwordsMatch(v, ctx);
    if (v.current_password && v.current_password === v.password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Must be different from the old password" });
    }
  });

export const codeSchema = z.object({ code: otpSchema });
export const inviteCodeSchema = z.object({ email: emailSchema, code: otpSchema });
export const forgotSchema = z.object({ email: emailSchema });

// ── Change requests and reviews ───────────────────────────────────────────
export const changeRequestSchema = z.object({
  field: z.string().min(1).max(60),
  new_value: z.union([z.string(), z.array(z.string())]),
  reason: reasonSchema,
});

export const reviewSchema = z
  .object({ decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(500).optional() })
  .superRefine((v, ctx) => {
    if (v.decision === "reject" && (!v.reason || v.reason.length < 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "Please write a reason the person can see" });
    }
  });

export const deactivateSchema = z.object({ reason: reasonSchema, confirm_name: z.string().optional() });
