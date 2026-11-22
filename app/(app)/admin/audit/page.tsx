import AuditTable from "@/components/admin/AuditTable";
import PageHeader from "@/components/shell/PageHeader";
import { loadAudit } from "@/lib/auditView";
import { requirePage } from "@/lib/session";

export default async function PlatformAudit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePage(["platform_admin"]);
  return (
    <>
      <PageHeader title="Platform Audit Log" description="Hospitals, Hospital Admin and Admin events: who, what, old value, new value, when. Entries cannot be edited or deleted." />
      <AuditTable rows={await loadAudit()} searchParams={await searchParams} basePath="/admin/audit" />
    </>
  );
}
