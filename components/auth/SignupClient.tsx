"use client";

import { useRouter } from "next/navigation";
import { ClinicianForm, PatientForm } from "@/components/forms/PersonForms";

export default function SignupClient({ kind }: { kind: "patient" | "clinician" }) {
  const router = useRouter();
  const Form = kind === "patient" ? PatientForm : ClinicianForm;
  return (
    <Form
      mode="signup"
      submitUrl={`/api/auth/signup/${kind}`}
      onSuccess={(d) => {
        router.push(String(d.next ?? "/onboarding"));
        router.refresh();
      }}
    />
  );
}
