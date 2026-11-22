import "server-only";
import type { ChangeRequestView } from "@/components/admin/ChangeRequestList";
import { findField } from "@/lib/fields";
import { ROLE_LABEL, fullName, type Role } from "@/lib/roles";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

/** Pending change requests the CURRENT user may review. Read with their own session, so RLS decides. */
export async function pendingChangeRequests(): Promise<ChangeRequestView[]> {
  const supabase = await createUserClient();
  const { data } = await supabase.from("change_requests").select("*").eq("status", "pending").order("created_at");
  const rows = data ?? [];
  if (!rows.length) return [];
  const db = createServiceClient();
  const ids = [...new Set(rows.flatMap((r) => [r.requester_id, ...(r.field_name === "assigned_doctor_id" ? [r.old_value, r.new_value] : [])]).filter(Boolean))];
  const { data: people } = await db.from("profiles").select("id, given_names, last_name, user_code, role").in("id", ids);
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const show = (field: string, v: string | null) => {
    if (!v) return "";
    if (field === "assigned_doctor_id") return byId.get(v) ? `Dr ${fullName(byId.get(v)!)}` : v;
    if (field === "role") return ROLE_LABEL[v as Role] ?? v;
    return v;
  };
  return rows.map((r) => {
    const p = byId.get(r.requester_id);
    return {
      id: r.id,
      requesterName: p ? fullName(p) : "Unknown",
      requesterCode: p?.user_code ?? "",
      requesterRole: ROLE_LABEL[r.requester_role as Role] ?? r.requester_role,
      fieldLabel: findField(r.requester_role as Role, r.field_name)?.label ?? r.field_name,
      oldValue: show(r.field_name, r.old_value),
      newValue: show(r.field_name, r.new_value),
      reason: r.reason,
      createdAt: r.created_at,
    };
  });
}
