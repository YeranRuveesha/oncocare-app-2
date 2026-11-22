import AddStaffForm from "@/components/admin/AddStaffForm";
import StaffActions from "@/components/admin/StaffActions";
import DataTable from "@/components/data/DataTable";
import { StatusBadge } from "@/components/profile/ProfileClient";
import PageHeader from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, fullName, type AccountStatus } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function AdminsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePage(["platform_admin"]);
  const sp = await searchParams;
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, user_code, given_names, last_name, email, status, activated_at, created_at")
    .eq("role", "platform_admin")
    .order("created_at")
    .limit(2000);
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Admins" description="Platform Admins manage hospitals. You cannot deactivate yourself, and the last active Admin always stays." actions={<AddStaffForm kind="platform_admin" />} />
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        searchParams={sp}
        basePath="/admin/admins"
        defaultSort="name"
        searchPlaceholder="Search name, ID or email"
        filters={[{ key: "status", label: "Status", options: (Object.keys(STATUS_LABEL) as AccountStatus[]).map((x) => ({ value: x, label: STATUS_LABEL[x] })), match: (a, v) => a.status === v }]}
        columns={[
          { key: "name", header: "Name", sortValue: (a) => fullName(a), searchText: (a) => fullName(a), cell: (a) => <span className="font-medium">{fullName(a)} {a.id === s.userId && <Badge variant="secondary">You</Badge>}</span> },
          { key: "code", header: "User ID", sortValue: (a) => a.user_code, searchText: (a) => a.user_code, cell: (a) => <span className="font-mono text-xs">{a.user_code}</span> },
          { key: "email", header: "Email", sortValue: (a) => a.email, searchText: (a) => a.email, cell: (a) => <span className="text-sm">{a.email}</span> },
          { key: "status", header: "Status", sortValue: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
          { key: "act", header: "Actions", cell: (a) => (a.id !== s.userId ? <StaffActions url={`/api/admin/admins/${a.id}`} status={a.status} activated={Boolean(a.activated_at)} email={a.email} /> : <span className="text-xs text-muted-foreground">—</span>) },
        ]}
      />
    </>
  );
}
