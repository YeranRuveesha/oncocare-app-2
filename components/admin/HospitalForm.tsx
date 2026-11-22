"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { PhoneField, SelectField, TEST_PHONE_HINT, TextField } from "@/components/forms/inputs";
import { useForm } from "@/components/forms/useForm";
import Wizard from "@/components/forms/Wizard";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { api } from "@/lib/client";
import { HOSPITAL_TYPES } from "@/lib/options";
import { hospitalAdminSchema, hospitalSchema } from "@/lib/validation/forms";
import BrandPreview from "./BrandPreview";
import ColorField from "./ColorField";
import CredentialsCard from "./CredentialsCard";
import LogoPicker from "./LogoPicker";

// Fixed English names (the same on the server and in every browser).
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil", "Bulgaria",
  "Cambodia", "Canada", "Chile", "China", "Colombia", "Croatia", "Cyprus", "Czechia", "Denmark", "Egypt", "Estonia",
  "Finland", "France", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran",
  "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya", "Kuwait", "Latvia", "Lebanon", "Lithuania",
  "Luxembourg", "Malaysia", "Maldives", "Malta", "Mexico", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway",
  "Oman", "Pakistan", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Singapore",
  "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan",
  "Thailand", "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Vietnam",
];

const H_FIELDS = ["name", "short_name", "registration_no", "type", "address_line", "city", "district", "country", "email", "phone", "primary_color", "secondary_color"];
const A_FIELDS = ["last_name", "given_names", "email", "phone", "nic", "job_title", "staff_id"];

/** Admin: Create Hospital (2 steps) or Edit Hospital (1 page). Live preview of the navigation panel. */
export default function HospitalForm({
  mode, hospitalId, initial, logo, code,
}: {
  mode: "create" | "edit";
  hospitalId?: string;
  initial?: Record<string, string>;
  logo?: string | null;
  code?: string;
}) {
  const router = useRouter();
  const h = useForm<Record<string, unknown>>({
    name: "", short_name: "", registration_no: "", type: "", address_line: "", city: "", district: "", country: "Sri Lanka",
    email: "", phone: "", primary_color: "#0F4C81", secondary_color: "#1B7A7E", ...initial,
  });
  const a = useForm<Record<string, unknown>>({ last_name: "", given_names: "", email: "", phone: "", nic: "", job_title: "", staff_id: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(logo ?? null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ userCode: string; tempPassword: string; hospitalId: string; code: string } | null>(null);
  const countryList = COUNTRIES;
  const hc = { v: h.v, set: h.set, errors: h.errors };
  const ac = { v: a.v, set: a.set, errors: a.errors };

  const submit = async () => {
    setError(undefined);
    const okH = h.validate(hospitalSchema);
    const okA = mode === "create" ? a.validate(hospitalAdminSchema) : true;
    if (!okH || !okA) return setError("Please fix the highlighted fields.");
    const fd = new FormData();
    fd.append("data", JSON.stringify(mode === "create" ? { hospital: h.v, admin: a.v } : h.v));
    if (file) fd.append("logo", file);
    if (removeLogo) fd.append("remove_logo", "1");
    setBusy(true);
    const res = await api<{ userCode: string; tempPassword: string; hospitalId: string; code: string }>(
      mode === "create" ? "/api/admin/hospitals" : `/api/admin/hospitals/${hospitalId}`,
      fd,
      mode === "create" ? "POST" : "PATCH",
    );
    setBusy(false);
    if (!res.ok) {
      const errs = res.errors ?? {};
      const hErr: Record<string, string> = {};
      const aErr: Record<string, string> = {};
      for (const [k, v] of Object.entries(errs)) {
        if (k.startsWith("admin.")) aErr[k.slice(6)] = v;
        else hErr[k.replace(/^hospital\./, "")] = v;
      }
      h.setErrors(hErr);
      a.setErrors(aErr);
      return setError(res.error);
    }
    if (mode === "create") setResult(res.data);
    else {
      router.push(`/admin/hospitals/${hospitalId}`);
      router.refresh();
    }
  };

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <FormAlert kind="success">Hospital created with code <b className="font-mono">{result.code}</b>. Status: Awaiting admin setup.</FormAlert>
        <CredentialsCard userCode={result.userCode} tempPassword={result.tempPassword} email={String(a.v.email)} />
        <div>
          <Button onClick={() => router.push(`/admin/hospitals/${result.hospitalId}`)}>Open the hospital</Button>
        </div>
      </div>
    );
  }

  const hospitalFields = (
    <>
      <TextField name="name" label="Hospital name" required hint="3 to 100 characters, must be unique" {...hc} />
      <TextField name="short_name" label="Hospital short name" required hint="e.g. NHSL" {...hc} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Hospital code</span>
        <span className="flex h-10 items-center rounded-md border bg-muted px-3 font-mono text-sm text-muted-foreground">{code ?? "Generated automatically"}</span>
      </div>
      <TextField name="registration_no" label="Registration / licence number" required {...hc} />
      <SelectField name="type" label="Hospital type" required options={HOSPITAL_TYPES} {...hc} />
      <TextField name="address_line" label="Address line" required {...hc} />
      <TextField name="city" label="City" required {...hc} />
      <TextField name="district" label="District" required {...hc} />
      <SelectField name="country" label="Country" required options={countryList} {...hc} />
      <TextField name="email" label="Official hospital email" type="email" required {...hc} />
      <PhoneField name="phone" label="Official hospital telephone" required {...hc} />
      <div className="sm:col-span-2 grid gap-6 rounded-xl border bg-ice p-4 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <LogoPicker
            preview={preview}
            onFile={(f, url) => { setFile(f); setPreview(url); setRemoveLogo(false); }}
            onClear={() => { setFile(null); setPreview(null); setRemoveLogo(true); }}
            error={h.errors.logo}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField id="primary_color" label="Primary colour" value={String(h.v.primary_color)} onChange={(x) => h.set("primary_color", x)} error={h.errors.primary_color} />
            <ColorField id="secondary_color" label="Secondary colour" value={String(h.v.secondary_color)} onChange={(x) => h.set("secondary_color", x)} error={h.errors.secondary_color} />
          </div>
        </div>
        <BrandPreview name={String(h.v.name)} logo={preview} primary={String(h.v.primary_color)} secondary={String(h.v.secondary_color)} />
      </div>
    </>
  );

  if (mode === "edit") {
    return (
      <form className="flex flex-col gap-4" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2">{hospitalFields}</div>
        {error && <FormAlert>{error}</FormAlert>}
        <div><Button type="submit" variant="brand" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save hospital</Button></div>
      </form>
    );
  }

  const adminFields = (
    <>
      <TextField name="last_name" label="Last name" required {...ac} />
      <TextField name="given_names" label="Given name/s" required {...ac} />
      <TextField name="email" label="Email" type="email" required {...ac} />
      <PhoneField name="phone" label="Telephone" required hint={TEST_PHONE_HINT} {...ac} />
      <TextField name="nic" label="NIC number" required maxLength={12} {...ac} />
      <TextField name="job_title" label="Job title" required hint="e.g. IT & Admin Manager" {...ac} />
      <TextField name="staff_id" label="Staff / employee ID" {...ac} />
    </>
  );

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <Wizard
        sections={[
          { id: "h", title: "Hospital details", fields: H_FIELDS, content: hospitalFields },
          { id: "a", title: "First Hospital Admin", fields: A_FIELDS, content: adminFields },
        ]}
        canLeave={(fields) => (fields === H_FIELDS ? h.validate(hospitalSchema) : a.validate(hospitalAdminSchema))}
        onSubmit={() => void submit()}
        submitLabel="Create hospital"
        busy={busy}
        error={error}
      />
    </div>
  );
}
