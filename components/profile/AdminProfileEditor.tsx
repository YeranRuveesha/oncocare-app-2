"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Pencil } from "lucide-react";
import CodeStep from "@/components/auth/CodeStep";
import OtpInput from "@/components/forms/OtpInput";
import PhoneInput from "@/components/forms/PhoneInput";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client";
import { findField } from "@/lib/fields";

interface Values { last_name: string; given_names: string; nic: string; email: string; phone: string }
export interface PendingVerify { id: string; field: string; value: string }

/** The Admin edits their own details directly (no request, no approval) after re-entering password + authenticator code. */
export default function AdminProfileEditor({ userCode, values, pending }: { userCode: string; values: Values; pending: PendingVerify[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState<Values>(values);
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [verify, setVerify] = useState<PendingVerify[]>(pending);
  const set = (k: keyof Values, x: string) => setV((p) => ({ ...p, [k]: x }));

  async function save() {
    const e: Record<string, string> = {};
    const body: Record<string, string> = { password, totp };
    (Object.keys(values) as (keyof Values)[]).forEach((k) => {
      if (v[k].trim() === values[k]) return;
      const def = findField("platform_admin", k);
      const r = def?.schema?.safeParse(v[k].trim());
      if (r && !r.success) e[k] = r.error.issues[0]?.message ?? "Not valid"; else body[k] = v[k].trim();
    });
    if (!password) e.password = "Enter your current password";
    if (!/^\d{6}$/.test(totp)) e.totp = "Enter the 6-digit code from your authenticator app";
    if (Object.keys(body).length === 2 && !Object.keys(e).length) e.form = "You have not changed anything.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await api<{ saved: string[]; verify: PendingVerify[] }>("/api/profile/admin", body);
    setBusy(false);
    setTotp(""); // a code is single-use
    if (!res.ok) return setErrors({ ...(res.errors ?? {}), form: res.error ?? "" });
    setPassword(""); setEditing(false);
    setVerify(res.data.verify ?? []);
    setDone(res.data.saved?.length ? "Your details were saved. Other devices were logged out and a notice was sent to your email." : "Almost done: verify the new value below.");
    router.refresh();
  }

  const rows: [keyof Values, string][] = [["last_name", "Last name"], ["given_names", "Given name/s"], ["nic", "NIC number"], ["email", "Email address"], ["phone", "Telephone number"]];
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
          <h2 className="font-display text-base font-bold">My details</h2>
          {!editing && <Button size="sm" variant="outline" onClick={() => { setEditing(true); setDone(null); }}><Pencil /> Edit my details</Button>}
        </div>
        {done && <div className="px-5 pt-4"><FormAlert kind="success">{done}</FormAlert></div>}
        <ul className="divide-y">
          <li className="px-5 py-3"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Lock className="size-3" aria-label="Locked" /> User ID</p><p className="font-mono text-sm font-semibold">{userCode}</p><p className="text-xs text-muted-foreground">Your User ID can never change.</p></li>
          {!editing && rows.map(([k, l]) => <li key={k} className="px-5 py-3"><p className="text-xs font-medium text-muted-foreground">{l}</p><p className="break-words text-sm font-semibold">{values[k] || "—"}</p></li>)}
        </ul>
        {editing && (
          <form className="flex flex-col gap-4 p-5" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
            <Field id="last_name" label="Last name" required error={errors.last_name}><Input id="last_name" value={v.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
            <Field id="given_names" label="Given name/s" required error={errors.given_names}><Input id="given_names" value={v.given_names} onChange={(e) => set("given_names", e.target.value)} /></Field>
            <Field id="nic" label="NIC number" required error={errors.nic} hint="9 digits + V or X, or 12 digits"><Input id="nic" value={v.nic} onChange={(e) => set("nic", e.target.value)} /></Field>
            <Field id="email" label="Email address" required error={errors.email} hint="A new email must be verified with a code before it is used. Your current one keeps working until then."><Input id="email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field id="phone" label="Telephone number" required error={errors.phone} hint="A new number must be verified with a code first."><PhoneInput id="phone" value={v.phone} onChange={(x) => set("phone", x)} /></Field>
            <div className="rounded-lg border bg-ice p-4">
              <p className="mb-3 text-sm font-semibold">To save, confirm it is you</p>
              <Field id="pw" label="Current password" required error={errors.password}><Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              <Field id="totp" label="Authenticator code (6 digits, new each time)" required error={errors.totp} className="mt-3"><OtpInput id="totp" value={totp} onChange={setTotp} invalid={!!errors.totp} /></Field>
            </div>
            {errors.form && <FormAlert>{errors.form}</FormAlert>}
            <div className="flex gap-2"><Button type="submit" variant="brand" disabled={busy}>{busy ? "Checking…" : "Save changes"}</Button><Button type="button" variant="ghost" onClick={() => { setEditing(false); setV(values); setErrors({}); }}>Cancel</Button></div>
          </form>
        )}
      </section>
      {verify.map((p) => (
        <section key={p.id} className="rounded-xl border-2 border-amber-300 bg-white p-5 shadow-sm">
          <CodeStep
            title={`Verify your new ${p.field === "email" ? "email address" : "telephone number"}`}
            description={<>We sent a code to <b>{p.value}</b>. Until you enter it, your current {p.field === "email" ? "email" : "number"} stays in use.</>}
            sendUrl={`/api/change-requests/${p.id}/send`}
            verifyUrl={`/api/change-requests/${p.id}/verify`}
            onVerified={() => { setVerify((x) => x.filter((y) => y.id !== p.id)); setDone("Verified. Your details were updated and other devices were logged out."); router.refresh(); }}
          />
        </section>
      ))}
    </div>
  );
}
