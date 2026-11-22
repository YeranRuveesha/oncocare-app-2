import { parseBody } from "@/lib/api";
import { selfSignup } from "@/lib/signup";
import { patientSignupSchema } from "@/lib/validation/forms";

/** Patient sign-up. Everyone who registers here is saved as a PATIENT. */
export async function POST(req: Request) {
  const body = await parseBody(req, patientSignupSchema);
  if ("response" in body) return body.response;
  const v = body.data;
  return selfSignup(req, {
    role: "patient",
    hospitalId: v.hospital_id,
    password: v.password,
    person: { last_name: v.last_name, given_names: v.given_names, email: v.email, phone: v.phone, nic: v.nic },
    patient: {
      assigned_doctor_id: v.assigned_doctor_id,
      transplant_date: v.transplant_date,
      diagnosis: v.diagnosis,
      diagnosis_other: v.diagnosis === "Other" ? v.diagnosis_other : undefined,
      transplant_type: v.transplant_type,
      date_of_birth: v.date_of_birth,
      gender: v.gender,
      ec_name: v.ec_name,
      ec_relationship: v.ec_relationship,
      ec_relationship_other: v.ec_relationship_other,
      ec_phone: v.ec_phone,
    },
  });
}
