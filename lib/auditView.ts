import "server-only";
import type { AuditRow } from "@/components/admin/AuditTable";
import { fullName } from "@/lib/roles";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

/** Latest audit entries the CURRENT user may see (their own session, so RLS decides). */
export async function loadAudit(limit = 200): Promise<AuditRow[]> {
  const supabase = await createUserClient();
  const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length
    ? await createServiceClient().from("profiles").select("id, given_names, last_name, user_code").in("id", actorIds)
    : { data: [] };
  const byId = new Map((actors ?? []).map((a) => [a.id, `${fullName(a)} (${a.user_code})`]));
  return rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    actor: byId.get(r.actor_id) ?? "System",
    action: r.action,
    target: [r.target_type, r.target_label].filter(Boolean).join(" "),
    old_value: r.old_value,
    new_value: r.new_value,
  }));
}
