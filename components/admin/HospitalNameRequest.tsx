"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";

/** The hospital name is locked: the Hospital Admin asks the Admin to change it. */
export default function HospitalNameRequest({ current, pending }: { current: string; pending: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  if (pending) return <FormAlert kind="info">A name change to <b>{pending}</b> is waiting for the Admin&apos;s approval.</FormAlert>;
  if (!open) return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Request name change</Button>;
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-ice p-4">
      <Field id="hn" label="New hospital name" required>
        <Input id="hn" value={name} onChange={(e) => setName(e.target.value)} placeholder={current} />
      </Field>
      <Field id="hr" label="Reason" required>
        <Textarea id="hr" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="brand"
          onClick={async () => {
            const res = await api("/api/change-requests", { field: "hospital_name", new_value: name, reason });
            if (!res.ok) return setError(res.errors?.new_value || res.errors?.reason || res.error);
            setOpen(false);
            router.refresh();
          }}
        >
          Send to Admin
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
