import "server-only";
import { fieldsForRole } from "@/lib/fields";
import { fieldValue, type FullProfile } from "@/lib/profileData";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import type { FieldRow } from "@/components/profile/ProfileClient";

/** Field rows for a profile page (no Zod schemas: those stay in lib/fields). */
export function profileRows(fp: FullProfile): FieldRow[] {
  return fieldsForRole(fp.profile.role).map((f) => {
    const display = fieldValue(fp, f.key);
    let raw: string | string[] = display;
    if (f.kind === "multi") raw = fp.clinician?.qualifications ?? [];
    if (f.key === "assigned_doctor_id") raw = fp.patient?.assigned_doctor_id ?? "";
    return {
      key: f.key,
      label: f.label,
      kind: f.kind,
      options: f.options,
      hasOther: Boolean(f.otherColumn),
      locked: f.locked,
      requestable: f.requestable,
      display: f.key === "role" ? ROLE_LABEL[display as Role] ?? display : display,
      raw,
    };
  });
}
