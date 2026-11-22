import DataTable from "@/components/data/DataTable";

export interface AuditRow {
  id: number;
  created_at: string;
  actor: string;
  action: string;
  target: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
}

const fmt = (v: Record<string, unknown> | null) =>
  v && Object.keys(v).length ? Object.entries(v).map(([k, x]) => `${k}: ${Array.isArray(x) ? x.join(", ") : x ?? "—"}`).join("; ") : "—";

/** Read-only audit log (the database blocks edits and deletes). */
export default function AuditTable({ rows, searchParams, basePath }: { rows: AuditRow[]; searchParams: Record<string, string | undefined>; basePath: string }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => String(r.id)}
      searchParams={searchParams}
      basePath={basePath}
      defaultSort="when"
      defaultDir="desc"
      searchPlaceholder="Search who, what or target"
      empty="No audit entries yet."
      columns={[
        { key: "when", header: "When", sortValue: (r) => new Date(r.created_at), cell: (r) => <span className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span> },
        { key: "who", header: "Who", sortValue: (r) => r.actor, searchText: (r) => r.actor, cell: (r) => <span className="text-xs">{r.actor}</span> },
        { key: "what", header: "What", sortValue: (r) => r.action, searchText: (r) => r.action, cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
        { key: "target", header: "Target", sortValue: (r) => r.target, searchText: (r) => r.target, cell: (r) => <span className="text-xs">{r.target}</span> },
        { key: "old", header: "Old value", searchText: (r) => fmt(r.old_value), cell: (r) => <span className="block max-w-56 break-words text-xs text-muted-foreground">{fmt(r.old_value)}</span> },
        { key: "new", header: "New value", searchText: (r) => fmt(r.new_value), cell: (r) => <span className="block max-w-56 break-words text-xs">{fmt(r.new_value)}</span> },
      ]}
    />
  );
}
