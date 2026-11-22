import "server-only";
import type { ServiceClient } from "@/lib/supabase/server";

export interface AuditEntry {
  actorId: string | null;
  actorRole: string | null;
  hospitalId?: string | null;
  action: string; // e.g. "hospital.created", "user.deactivated"
  targetType: "hospital" | "hospital_admin" | "platform_admin" | "patient" | "clinician" | "change_request" | "discharge_instructions" | "symptom_report" | "exercise_plan";
  targetId?: string | null;
  targetLabel?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

/** Removes anything that looks like a password before it reaches the audit log. */
function clean(v?: Record<string, unknown> | null) {
  if (!v) return null;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) if (!/password|secret|token/i.test(k)) out[k] = val;
  return out;
}

export async function writeAudit(db: ServiceClient, e: AuditEntry) {
  const { error } = await db.from("audit_logs").insert({
    actor_id: e.actorId,
    actor_role: e.actorRole,
    hospital_id: e.hospitalId ?? null,
    action: e.action,
    target_type: e.targetType,
    target_id: e.targetId ?? null,
    target_label: e.targetLabel ?? null,
    old_value: clean(e.oldValue),
    new_value: clean(e.newValue),
  });
  if (error) console.error("[audit] failed:", error.message);
}

/** Only the fields that actually changed, for old/new audit values. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)) {
      oldValue[k] = before[k] ?? null;
      newValue[k] = after[k] ?? null;
    }
  }
  return { oldValue, newValue, changed: Object.keys(newValue).length > 0 };
}

export function auditTargetType(role: string): AuditEntry["targetType"] {
  if (role === "platform_admin") return "platform_admin";
  if (role === "hospital_admin") return "hospital_admin";
  if (role === "patient") return "patient";
  return "clinician";
}
