"use client";

import { useState } from "react";
import PhoneInput from "@/components/forms/PhoneInput";
import Qualifications from "@/components/forms/Qualifications";
import { useDoctors } from "@/components/forms/useLists";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { FieldKind } from "@/lib/fields";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { todayIso } from "@/lib/validation/common";

/** The right input for a field kind (used by change requests). */
export default function ValueInput({
  id, kind, options, hasOther, value, onChange, hospitalId,
}: {
  id: string;
  kind: FieldKind;
  options?: readonly string[];
  hasOther?: boolean;
  value: string | string[];
  onChange: (v: string | string[]) => void;
  hospitalId?: string | null;
}) {
  const { doctors } = useDoctors(kind === "doctor" ? hospitalId ?? undefined : undefined);
  const str = Array.isArray(value) ? "" : value;
  const [base, other] = str.startsWith("Other:") ? ["Other", str.slice(6).trim()] : [str, ""];
  const [otherText, setOtherText] = useState(other);

  switch (kind) {
    case "phone":
      return <PhoneInput id={id} value={str} onChange={onChange} />;
    case "date":
      return <Input id={id} type="date" max={todayIso()} value={str} onChange={(e) => onChange(e.target.value)} />;
    case "multi":
      return <Qualifications value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case "doctor":
      return (
        <NativeSelect id={id} value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose a doctor…</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </NativeSelect>
      );
    case "select":
      return (
        <div className="flex flex-col gap-2">
          <NativeSelect
            id={id}
            value={base}
            onChange={(e) => onChange(e.target.value === "Other" && hasOther ? `Other: ${otherText}` : e.target.value)}
          >
            <option value="">Choose…</option>
            {(options ?? []).map((o) => (
              <option key={o} value={o}>{ROLE_LABEL[o as Role] ?? o}</option>
            ))}
          </NativeSelect>
          {hasOther && base === "Other" && (
            <Input
              aria-label="Please type"
              placeholder="Please type"
              value={otherText}
              onChange={(e) => {
                setOtherText(e.target.value);
                onChange(`Other: ${e.target.value}`);
              }}
            />
          )}
        </div>
      );
    default:
      return <Input id={id} type={kind === "email" ? "email" : "text"} value={str} onChange={(e) => onChange(e.target.value)} />;
  }
}
