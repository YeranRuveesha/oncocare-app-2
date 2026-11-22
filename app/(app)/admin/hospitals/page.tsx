import Link from "next/link";
import { Plus } from "lucide-react";
import DataTable from "@/components/data/DataTable";
import HospitalStatusBadge from "@/components/admin/HospitalStatusBadge";
import PageHeader from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { HOSPITAL_STATUS_LABEL, type HospitalStatus } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export default async function HospitalsList({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePage(["platform_admin"]);
  const sp = await searchParams;
  const { data } = await createServiceClient().from("hospitals").select("id, name, short_name, code, city, status, created_at").order("name").limit(2000);
  const rows = data ?? [];
  return (
    <>
      <PageHeader
        title="Hospitals"
        actions={<Button asChild variant="brand"><Link href="/admin/hospitals/new"><Plus /> Create hospital</Link></Button>}
      />
      <DataTable
        rows={rows}
        rowKey={(h) => h.id}
        searchParams={sp}
        basePath="/admin/hospitals"
        defaultSort="name"
        searchPlaceholder="Search name, code or city"
        empty="No hospitals yet. Create the first one."
        rowHref={(h) => `/admin/hospitals/${h.id}`}
        filters={[{
          key: "status", label: "Status",
          options: (Object.keys(HOSPITAL_STATUS_LABEL) as HospitalStatus[]).map((s) => ({ value: s, label: HOSPITAL_STATUS_LABEL[s] })),
          match: (h, v) => h.status === v,
        }]}
        columns={[
          { key: "name", header: "Name", sortValue: (h) => h.name, searchText: (h) => `${h.name} ${h.short_name}`, cell: (h) => <>{h.name} <span className="text-xs font-normal text-muted-foreground">({h.short_name})</span></> },
          { key: "code", header: "Code", sortValue: (h) => h.code, searchText: (h) => h.code, cell: (h) => <span className="font-mono text-xs">{h.code}</span> },
          { key: "city", header: "City", sortValue: (h) => h.city, searchText: (h) => h.city ?? "", cell: (h) => h.city },
          { key: "status", header: "Status", sortValue: (h) => h.status, cell: (h) => <HospitalStatusBadge status={h.status as HospitalStatus} /> },
        ]}
      />
    </>
  );
}
