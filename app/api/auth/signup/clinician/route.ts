import { parseBody } from "@/lib/api";
import { selfSignup } from "@/lib/signup";
import { clinicianSignupSchema } from "@/lib/validation/forms";

/** Clinician sign-up: saved as junior_doctor or senior_consultant, status "pending" until approved. */
export async function POST(req: Request) {
  const body = await parseBody(req, clinicianSignupSchema);
  if ("response" in body) return body.response;
  const v = body.data;
  return selfSignup(req, {
    role: v.clinician_role,
    hospitalId: v.hospital_id,
    password: v.password,
    person: { last_name: v.last_name, given_names: v.given_names, email: v.email, phone: v.phone, nic: v.nic },
    clinician: {
      slmc_no: v.slmc_no,
      qualifications: v.qualifications,
      specialty: v.specialty,
      specialty_other: v.specialty_other,
      department: v.department,
      years_experience: v.years_experience,
    },
  });
}
