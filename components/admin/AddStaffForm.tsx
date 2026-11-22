"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { PhoneField, TEST_PHONE_HINT, TextField } from "@/components/forms/inputs";
import { useForm } from "@/components/forms/useForm";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";
import { adminInviteSchema, hospitalAdminSchema } from "@/lib/validation/forms";
import CredentialsCard from "./CredentialsCard";

/** Add a Hospital Admin (with job title) or invite an Admin. Shows the credentials once. */
export default function AddStaffForm({ kind, hospitalId }: { kind: "hospital_admin" | "platform_admin"; hospitalId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const f = useForm<Record<string, unknown>>({ last_name: "", given_names: "", email: "", phone: "", nic: "", job_title: "", staff_id: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [creds, setCreds] = useState<{ userCode: string; tempPassword: string; email: string } | null>(null);
  const common = { v: f.v, set: f.set, errors: f.errors };
  const schema = kind === "hospital_admin" ? hospitalAdminSchema : adminInviteSchema;

  if (creds) return <CredentialsCard userCode={creds.userCode} tempPassword={creds.tempPassword} email={creds.email} />;
  if (!open) return <Button variant="brand" onClick={() => setOpen(true)}><UserPlus /> {kind === "hospital_admin" ? "Add Hospital Admin" : "Invite an Admin"}</Button>;
  return (
    <form
      className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.validate(schema)) return;
        setBusy(true);
        setError(undefined);
        const url = kind === "hospital_admin" ? "/api/admin/hospital-admins" : "/api/admin/admins";
        const res = await api<{ userCode: string; tempPassword: string }>(url, { ...f.v, hospital_id: hospitalId });
        setBusy(false);
        if (!res.ok) {
          if (res.errors) f.setErrors(res.errors);
          return setError(res.error);
        }
        setCreds({ ...res.data, email: String(f.v.email) });
        router.refresh();
      }}
    >
      <TextField name="last_name" label="Last name" required {...common} />
      <TextField name="given_names" label="Given name/s" required {...common} />
      <TextField name="email" label="Email" type="email" required {...common} />
      <PhoneField name="phone" label="Telephone" required hint={TEST_PHONE_HINT} {...common} />
      <TextField name="nic" label="NIC number" required maxLength={12} {...common} />
      {kind === "hospital_admin" && (
        <>
          <TextField name="job_title" label="Job title" required {...common} />
          <TextField name="staff_id" label="Staff / employee ID" {...common} />
        </>
      )}
      {error && <div className="sm:col-span-2"><FormAlert>{error}</FormAlert></div>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" variant="brand" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Create and show credentials</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
