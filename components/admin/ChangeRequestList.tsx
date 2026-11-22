import DataTable from "@/components/data/DataTable";
import { Badge } from "@/components/ui/badge";
import ReviewButtons from "./ReviewButtons";

export interface ChangeRequestView {
  id: string;
  requesterName: string;
  requesterCode: string;
  requesterRole: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  reason: string;
  createdAt: string;
}

/** ONE shared approvals list for Hospital Admins and Admins. RLS already limits what each sees. */
export default function ChangeRequestList({ items, searchParams, basePath, prefix = "cr_" }: { items: ChangeRequestView[]; searchParams: Record<string, string | undefined>; basePath: string; prefix?: string }) {
  return (
    <DataTable
      rows={items}
      rowKey={(r) => r.id}
      searchParams={searchParams}
      basePath={basePath}
      prefix={prefix}
      defaultSort="date"
      defaultDir="asc"
      searchPlaceholder="Search name, ID or field"
      empty="No pending change requests."
      columns={[
        { key: "who", header: "Requested by", sortValue: (r) => r.requesterName, searchText: (r) => `${r.requesterName} ${r.requesterCode} ${r.requesterRole}`, cell: (r) => (
          <div className="text-sm"><span className="font-semibold">{r.requesterName}</span> <span className="font-mono text-xs text-muted-foreground">{r.requesterCode}</span><div><Badge variant="secondary">{r.requesterRole}</Badge></div></div>
        ) },
        { key: "field", header: "Change", sortValue: (r) => r.fieldLabel, searchText: (r) => `${r.fieldLabel} ${r.oldValue} ${r.newValue}`, cell: (r) => (
          <div className="text-sm"><span className="text-muted-foreground">{r.fieldLabel}: </span><span className="line-through decoration-crimson/60">{r.oldValue || "—"}</span> → <span className="font-semibold">{r.newValue}</span></div>
        ) },
        { key: "reason", header: "Reason", searchText: (r) => r.reason, cell: (r) => <span className="text-xs">{r.reason}</span> },
        { key: "date", header: "Sent", sortValue: (r) => new Date(r.createdAt), cell: (r) => <span className="whitespace-nowrap text-xs">{new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span> },
        { key: "act", header: "Decision", cell: (r) => <ReviewButtons url={`/api/change-requests/${r.id}/review`} /> },
      ]}
    />
  );
}
