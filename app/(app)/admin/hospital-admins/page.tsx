import Link from "next/link";
import DataTable from "@/components/data/DataTable";
import { StatusBadge } from "@/components/profile/ProfileClient";
import PageHeader from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, fullName, type AccountStatus } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function HospitalAdminsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePage(["platform_admin"]);
  const sp = await searchParams;
  const supabase = await createUserClient(); // RLS: the Admin may read Hospital Admin + Admin profiles only
  const { data } = await supabase
    .from("profiles")
    .select("id, user_code, given_names, last_name, job_title, status, is_primary_admin, hospital_id, hospitals(name)")
    .eq("role", "hospital_admin")
    .order("last_name")
    .limit(2000);
  const rows = (data ?? []) as unknown as Array<{ id: string; user_code: string; given_names: string; last_name: string; job_title: string; status: string; is_primary_admin: boolean; hospital_id: string; hospitals: { name: string } | null }>;
  return (
    <>
      <PageHeader title="Hospital Admins" description="Open a hospital to add admins, resend credentials, reset an authenticator or deactivate." />
      <DataTable
        rows={rows}
        rowKey={(a) => a.id}
        searchParams={sp}
        basePath="/admin/hospital-admins"
        defaultSort="name"
        searchPlaceholder="Search name, ID or hospital"
        empty="No Hospital Admins yet."
        filters={[{ key: "status", label: "Status", options: (Object.keys(STATUS_LABEL) as AccountStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })), match: (a, v) => a.status === v }]}
        columns={[
          { key: "name", header: "Name", sortValue: (a) => fullName(a), searchText: (a) => fullName(a), cell: (a) => <div className="font-medium">{fullName(a)} {a.is_primary_admin && <Badge variant="secondary">Main</Badge>}<div className="text-xs font-normal text-muted-foreground">{a.job_title}</div></div> },
          { key: "code", header: "User ID", sortValue: (a) => a.user_code, searchText: (a) => a.user_code, cell: (a) => <span className="font-mono text-xs">{a.user_code}</span> },
          { key: "hospital", header: "Hospital", sortValue: (a) => a.hospitals?.name, searchText: (a) => a.hospitals?.name ?? "", cell: (a) => <Link className="text-primary hover:underline" href={`/admin/hospitals/${a.hospital_id}`}>{a.hospitals?.name}</Link> },
          { key: "status", header: "Status", sortValue: (a) => a.status, cell: (a) => <StatusBadge status={a.status} /> },
        ]}
      />
    </>
  );
}
