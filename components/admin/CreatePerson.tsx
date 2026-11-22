"use client";

import { useState } from "react";
import Link from "next/link";
import { ClinicianForm, PatientForm } from "@/components/forms/PersonForms";
import { FormAlert } from "@/components/ui/field";

/** Hospital Admin adds a patient or clinician. The person gets an invite email. */
export default function CreatePerson({ kind, hospitalId }: { kind: "patients" | "clinicians"; hospitalId: string }) {
  const [done, setDone] = useState<{ id: string; userCode: string } | null>(null);
  if (done) {
    return (
      <FormAlert kind="success">
        Account created with User ID <b className="font-mono">{done.userCode}</b>. An invite email was sent (Mailpit locally). The person sets their own password and
        verifies email, phone and authenticator before the account becomes active.{" "}
        <Link className="font-semibold underline" href={`/hospital/${kind}/${done.id}`}>Open profile</Link>
      </FormAlert>
    );
  }
  const Form = kind === "patients" ? PatientForm : ClinicianForm;
  return (
    <Form
      mode="create"
      hospitalId={hospitalId}
      initial={{ kind: kind === "patients" ? "patient" : "clinician" }}
      submitUrl="/api/hospital/users"
      onSuccess={(d) => setDone({ id: String(d.id), userCode: String(d.userCode) })}
    />
  );
}
