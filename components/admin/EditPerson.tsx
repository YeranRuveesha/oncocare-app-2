"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { ClinicianForm, PatientForm } from "@/components/forms/PersonForms";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

export default function EditPerson({ kind, id, hospitalId, initial }: { kind: "patients" | "clinicians"; id: string; hospitalId: string; initial: Record<string, unknown> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const Form = kind === "patients" ? PatientForm : ClinicianForm;
  if (!open) {
    return (
      <div className="flex flex-col gap-3">
        {saved && <FormAlert kind="success">Saved. The person was logged out of other devices and emailed. A new email or phone must be verified again at their next login.</FormAlert>}
        <div>
          <Button variant="outline" onClick={() => setOpen(true)}><Pencil /> Edit details</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Form
        mode="edit"
        hospitalId={hospitalId}
        initial={initial}
        submitUrl={`/api/hospital/users/${id}`}
        method="PATCH"
        onSuccess={() => {
          setOpen(false);
          setSaved(true);
          router.refresh();
        }}
      />
      <div>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
