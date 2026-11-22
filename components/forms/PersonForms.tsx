"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { ZodTypeAny } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";
import { CLINICIAN_ROLE_OPTIONS, DIAGNOSES, GENDERS, RELATIONSHIPS, SPECIALTIES, TRANSPLANT_TYPES } from "@/lib/options";
import {
  clinicianAdminSchema, clinicianSignupSchema, patientAdminSchema, patientSignupSchema,
} from "@/lib/validation/forms";
import { DateField, PhoneField, SelectField, TEST_PHONE_HINT, TextField } from "./inputs";
import { PasswordInput, PasswordRules } from "./PasswordInput";
import Qualifications from "./Qualifications";
import { useForm, type Values } from "./useForm";
import { useDoctors, useHospitals } from "./useLists";
import Wizard, { type Section } from "./Wizard";

/**
 * ONE patient form and ONE clinician form, used for:
 *  - "signup": public sign-up wizard (with password)
 *  - "create": Hospital Admin adds a person (an invite email is sent, no password)
 *  - "edit":   Hospital Admin edits any field
 */
export type FormMode = "signup" | "create" | "edit";

interface CommonProps {
  mode: FormMode;
  hospitalId?: string; // fixed hospital for create/edit
  initial?: Values;
  submitUrl: string;
  method?: "POST" | "PATCH";
  onSuccess: (data: Record<string, unknown>) => void;
}

function useFormHelpers(initial: Values) {
  const form = useForm(initial);
  const common = { v: form.v, set: form.set, errors: form.errors };
  return { form, common };
}

function PasswordSection({ v, set, errors }: { v: Values; set: (k: string, x: unknown) => void; errors: Record<string, string> }) {
  return (
    <>
      <Field id="password" label="Password" required error={errors.password} className="sm:col-span-2">
        <PasswordInput id="password" value={String(v.password ?? "")} invalid={Boolean(errors.password)} onChange={(x) => set("password", x)} />
        <PasswordRules value={String(v.password ?? "")} />
      </Field>
      <Field id="confirm_password" label="Confirm password" required error={errors.confirm_password} className="sm:col-span-2">
        <PasswordInput id="confirm_password" value={String(v.confirm_password ?? "")} invalid={Boolean(errors.confirm_password)} onChange={(x) => set("confirm_password", x)} />
      </Field>
    </>
  );
}

function PersonSection({ common, withDob }: { common: { v: Values; set: (k: string, x: unknown) => void; errors: Record<string, string> }; withDob?: boolean }) {
  return (
    <>
      <TextField name="last_name" label="Last name" required autoComplete="family-name" {...common} />
      <TextField name="given_names" label="Given name/s" required autoComplete="given-name" {...common} />
      <TextField name="email" label="Email address" type="email" required autoComplete="email" {...common} />
      <PhoneField name="phone" label="Telephone number" required hint={TEST_PHONE_HINT} {...common} />
      <TextField name="nic" label="NIC number" required hint="9 digits + V/X (e.g. 851234567V) or 12 digits" maxLength={12} {...common} />
      {withDob && (
        <>
          <DateField name="date_of_birth" label="Date of birth" required {...common} />
          <SelectField name="gender" label="Gender" required options={GENDERS} {...common} />
        </>
      )}
    </>
  );
}

function useSubmit(props: CommonProps, form: ReturnType<typeof useForm>, schema: ZodTypeAny) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async () => {
    setError(undefined);
    if (!form.validate(schema)) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setBusy(true);
    const res = await api(props.submitUrl, form.v, props.method ?? "POST");
    setBusy(false);
    if (!res.ok) {
      if (res.errors) form.setErrors(res.errors);
      setError(res.error);
      return;
    }
    props.onSuccess(res.data);
  };
  return { busy, error, submit };
}

// ── PATIENT ────────────────────────────────────────────────────────────────
export function PatientForm(props: CommonProps) {
  const { mode, hospitalId } = props;
  const { form, common } = useFormHelpers({
    last_name: "", given_names: "", email: "", phone: "", nic: "", password: "", confirm_password: "",
    hospital_id: hospitalId ?? "", assigned_doctor_id: "", transplant_date: "", diagnosis: "", diagnosis_other: "",
    transplant_type: "", date_of_birth: "", gender: "", ec_name: "", ec_relationship: "", ec_relationship_other: "",
    ec_phone: "",
    ...props.initial,
  });
  const { v, set } = form;
  const hospitals = useHospitals(mode === "signup");
  const { doctors, loading } = useDoctors(String(v.hospital_id || "") || undefined);
  const schema = mode === "signup" ? patientSignupSchema : patientAdminSchema;
  const { busy, error, submit } = useSubmit(props, form, schema);

  // Changing hospital clears a doctor from another hospital.
  useEffect(() => {
    if (v.assigned_doctor_id && doctors.length && !doctors.some((d) => d.id === v.assigned_doctor_id)) set("assigned_doctor_id", "");
  }, [doctors, v.assigned_doctor_id, set]);

  const medical = (
    <>
      {mode === "signup" && (
        <SelectField name="hospital_id" label="Hospital name" required options={hospitals.map((h) => ({ value: h.id, label: h.name }))}
          hint={hospitals.length === 0 ? "No hospitals are open for sign-up yet." : undefined} {...common} />
      )}
      <SelectField name="assigned_doctor_id" label="Assigned doctor" required
        options={doctors.map((d) => ({ value: d.id, label: d.name }))}
        placeholder={!v.hospital_id ? "Choose a hospital first" : loading ? "Loading…" : doctors.length ? "Choose…" : "No approved doctors yet"}
        disabled={!v.hospital_id}
        {...common} />
      <DateField name="transplant_date" label="Transplant date" required {...common} />
      <SelectField name="transplant_type" label="Transplant type" required options={TRANSPLANT_TYPES} {...common} />
      <SelectField name="diagnosis" label="Diagnosis" required options={DIAGNOSES} {...common} />
      {v.diagnosis === "Other" && <TextField name="diagnosis_other" label="Diagnosis (other)" {...common} />}
    </>
  );
  const emergency = (
    <>
      <TextField name="ec_name" label="Emergency contact name" required {...common} />
      <SelectField name="ec_relationship" label="Relationship" required options={RELATIONSHIPS} {...common} />
      {v.ec_relationship === "Other" && <TextField name="ec_relationship_other" label="Relationship (please type)" required {...common} />}
      <PhoneField name="ec_phone" label="Emergency contact phone number" required hint="Must be different from the patient's number." {...common} />
    </>
  );

  if (mode !== "signup") {
    return (
      <SinglePage busy={busy} error={error} onSubmit={submit} label={mode === "create" ? "Create patient and send invite" : "Save changes"}>
        <Group title="Personal details"><PersonSection common={common} withDob /></Group>
        <Group title="Treatment">{medical}</Group>
        <Group title="Emergency contact">{emergency}</Group>
      </SinglePage>
    );
  }

  const sections: Section[] = [
    { id: "you", title: "About you", fields: ["last_name", "given_names", "email", "phone", "nic", "date_of_birth", "gender"], content: <PersonSection common={common} withDob /> },
    { id: "pw", title: "Password", fields: ["password", "confirm_password"], content: <PasswordSection {...common} /> },
    { id: "treatment", title: "Hospital & treatment", fields: ["hospital_id", "assigned_doctor_id", "transplant_date", "transplant_type", "diagnosis", "diagnosis_other"], content: medical },
    { id: "ec", title: "Emergency contact", fields: ["ec_name", "ec_relationship", "ec_relationship_other", "ec_phone"], content: emergency },
  ];
  return <Wizard sections={sections} canLeave={(f) => form.validate(schema, f)} onSubmit={submit} submitLabel="Create my account" busy={busy} error={error} />;
}

// ── CLINICIAN ──────────────────────────────────────────────────────────────
export function ClinicianForm(props: CommonProps) {
  const { mode, hospitalId } = props;
  const { form, common } = useFormHelpers({
    last_name: "", given_names: "", email: "", phone: "", nic: "", password: "", confirm_password: "",
    hospital_id: hospitalId ?? "", clinician_role: "", slmc_no: "", qualifications: [] as string[],
    specialty: "", specialty_other: "", department: "", years_experience: "",
    ...props.initial,
  });
  const { v, set, errors } = form;
  const hospitals = useHospitals(mode === "signup");
  const schema = mode === "signup" ? clinicianSignupSchema : clinicianAdminSchema;
  const { busy, error, submit } = useSubmit(props, form, schema);

  const work = (
    <>
      {mode === "signup" && (
        <SelectField name="hospital_id" label="Hospital name" required options={hospitals.map((h) => ({ value: h.id, label: h.name }))} {...common} />
      )}
      <SelectField name="clinician_role" label="Clinician role" required options={CLINICIAN_ROLE_OPTIONS} {...common} />
      <TextField name="slmc_no" label="SLMC registration number" required hint="Letters and numbers only" maxLength={20} {...common} />
      <div className="sm:col-span-2">
        <Qualifications value={(v.qualifications as string[]) ?? []} error={errors.qualifications} onChange={(q) => set("qualifications", q)} />
      </div>
      <SelectField name="specialty" label="Specialty" required options={SPECIALTIES} {...common} />
      {v.specialty === "Other" && <TextField name="specialty_other" label="Specialty (please type)" required {...common} />}
      <TextField name="department" label="Department / Unit" hint="e.g. BMT Unit, Haematology Ward" {...common} />
      <TextField name="years_experience" label="Years of experience" type="number" inputMode="numeric" hint="0 to 60" {...common} />
    </>
  );

  if (mode !== "signup") {
    return (
      <SinglePage busy={busy} error={error} onSubmit={submit} label={mode === "create" ? "Create clinician and send invite" : "Save changes"}>
        <Group title="Personal details"><PersonSection common={common} /></Group>
        <Group title="Professional details">{work}</Group>
      </SinglePage>
    );
  }
  const sections: Section[] = [
    { id: "you", title: "About you", fields: ["last_name", "given_names", "email", "phone", "nic"], content: <PersonSection common={common} /> },
    { id: "pw", title: "Password", fields: ["password", "confirm_password"], content: <PasswordSection {...common} /> },
    { id: "work", title: "Professional details", fields: ["hospital_id", "clinician_role", "slmc_no", "qualifications", "specialty", "specialty_other", "department", "years_experience"], content: work },
  ];
  return <Wizard sections={sections} canLeave={(f) => form.validate(schema, f)} onSubmit={submit} submitLabel="Create my account" busy={busy} error={error} />;
}

// ── layout helpers for the single-page (admin) version ──────────────────────
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border bg-white p-5">
      <legend className="px-1 font-display text-base font-bold text-ink">{title}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function SinglePage({ children, busy, error, onSubmit, label }: { children: React.ReactNode; busy: boolean; error?: string; onSubmit: () => void; label: string }) {
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      {error && <FormAlert>{error}</FormAlert>}
      <div>
        <Button type="submit" variant="brand" size="lg" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Save />} {label}
        </Button>
      </div>
    </form>
  );
}
