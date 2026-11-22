"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Pencil, Save, X } from "lucide-react";
import CodeStep from "@/components/auth/CodeStep";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { findField, type FieldKind } from "@/lib/fields";
import type { Role } from "@/lib/roles";
import ValueInput from "./ValueInput";

export interface FieldRow {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  hasOther: boolean;
  locked: boolean;
  requestable: boolean;
  display: string;
  raw: string | string[];
}

export interface RequestRow {
  id: string;
  field_label: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  review_reason: string | null;
  created_at: string;
  applied_at: string | null;
}

export function StatusBadge({ status }: { status: string }) {
  const v = status === "approved" || status === "active" ? "routine" : status === "rejected" || status === "deactivated" ? "emergency" : "urgent";
  return <Badge variant={v}>{status.replace(/_/g, " ")}</Badge>;
}

function RequestChange({ row, role, hospitalId, onDone }: { row: FieldRow; role: Role; hospitalId: string | null; onDone: () => void }) {
  const [value, setValue] = useState<string | string[]>(row.kind === "multi" ? (row.raw as string[]) : "");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const def = findField(role, row.key);
    const e: Record<string, string> = {};
    const raw = Array.isArray(value) ? value : value.startsWith("Other:") ? "Other" : value;
    if (def?.schema) {
      const r = def.schema.safeParse(raw);
      if (!r.success) e.new_value = r.error.issues[0]?.message ?? "Not valid";
    }
    if (typeof value === "string" && value.startsWith("Other:") && !value.slice(6).trim()) e.new_value = "Please type the value";
    if (reason.trim().length < 3) e.reason = "Please give a reason";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const res = await api("/api/change-requests", { field: row.key, new_value: value, reason });
    setBusy(false);
    if (!res.ok) return setErrors({ ...(res.errors ?? {}), _form: res.error ?? "" });
    onDone();
  };

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border bg-ice p-4">
      <Field id={`new-${row.key}`} label={`New ${row.label.toLowerCase()}`} required error={errors.new_value}>
        <ValueInput id={`new-${row.key}`} kind={row.kind} options={row.options} hasOther={row.hasOther} value={value} onChange={setValue} hospitalId={hospitalId} />
      </Field>
      <Field id={`reason-${row.key}`} label="Reason for the change" required error={errors.reason}>
        <Textarea id={`reason-${row.key}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </Field>
      {errors._form && <FormAlert>{errors._form}</FormAlert>}
      {(row.kind === "email" || row.kind === "phone") && (
        <p className="text-xs text-muted-foreground">After approval you must verify the new {row.kind === "email" ? "email" : "number"} with a code. Your current one keeps working until then.</p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="brand" onClick={() => void submit()} disabled={busy}>Send request</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

function OptionalEdit({ row, onDone }: { row: FieldRow; onDone: () => void }) {
  const [value, setValue] = useState(Array.isArray(row.raw) ? "" : row.raw);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-start gap-2">
      <div className="min-w-48 flex-1">
        <Input aria-label={row.label} type={row.kind === "number" ? "number" : "text"} value={value} onChange={(e) => setValue(e.target.value)} />
        {error && <p className="mt-1 text-xs text-crimson">{error}</p>}
      </div>
      <Button
        size="sm"
        variant="brand"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await api("/api/profile", { field: row.key, value }, "PATCH");
          setBusy(false);
          if (!res.ok) return setError(res.error);
          onDone();
        }}
      >
        <Save /> Save
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}><X /> Cancel</Button>
    </div>
  );
}

export default function ProfileClient({
  rows, role, hospitalId, requests,
}: {
  rows: FieldRow[];
  role: Role;
  hospitalId: string | null;
  requests: RequestRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const done = () => {
    setOpen(null);
    router.refresh();
  };
  const pendingFields = new Set(requests.filter((r) => r.status === "pending").map((r) => r.field_name));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border bg-white shadow-sm">
        <h2 className="border-b px-5 py-3 font-display text-base font-bold">My details</h2>
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.key} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {row.locked && <Lock className="size-3" aria-label="Locked" />} {row.label}
                  </p>
                  <p className="break-words text-sm font-semibold text-ink">{row.display || <span className="font-normal text-muted-foreground">Not set</span>}</p>
                </div>
                {row.locked && row.requestable && (
                  pendingFields.has(row.key) ? (
                    <Badge variant="urgent">Change requested</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setOpen(open === row.key ? null : row.key)}>Request change</Button>
                  )
                )}
                {!row.locked && row.requestable === false && row.key !== "user_code" && row.key !== "hospital" && (
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === row.key ? null : row.key)}>
                    <Pencil /> Edit
                  </Button>
                )}
              </div>
              {open === row.key && row.locked && <RequestChange row={row} role={role} hospitalId={hospitalId} onDone={done} />}
              {open === row.key && !row.locked && <OptionalEdit row={row} onDone={done} />}
            </li>
          ))}
        </ul>
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          <Lock className="mr-1 inline size-3" /> Locked fields can only be changed through a request that your approver reviews. Your User ID can never change.
        </p>
      </section>

      <section className="rounded-xl border bg-white shadow-sm">
        <h2 className="border-b px-5 py-3 font-display text-base font-bold">My change requests</h2>
        {requests.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="divide-y">
            {requests.map((r) => {
              const needsVerify = r.status === "approved" && !r.applied_at && (r.field_name === "email" || r.field_name === "phone");
              return (
                <li key={r.id} className="flex flex-col gap-2 px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{r.field_label}</p>
                    <StatusBadge status={needsVerify ? "approved – verify now" : r.status} />
                  </div>
                  <p className="text-muted-foreground">
                    {r.old_value || "—"} → <span className="font-medium text-ink">{r.new_value}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Reason: {r.reason} · {new Date(r.created_at).toLocaleDateString("en-GB")}</p>
                  {r.status === "rejected" && r.review_reason && <FormAlert kind="warning">Rejected: {r.review_reason}</FormAlert>}
                  {needsVerify &&
                    (verifying === r.id ? (
                      <div className="rounded-lg border bg-ice p-4">
                        <CodeStep
                          title={`Verify your new ${r.field_name === "email" ? "email" : "telephone number"}`}
                          description={<>We sent a code to <b>{r.new_value}</b>.</>}
                          sendUrl={`/api/change-requests/${r.id}/send`}
                          verifyUrl={`/api/change-requests/${r.id}/verify`}
                          onVerified={() => {
                            setVerifying(null);
                            router.refresh();
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <Button size="sm" variant="brand" onClick={() => setVerifying(r.id)}>Verify the new value</Button>
                      </div>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
