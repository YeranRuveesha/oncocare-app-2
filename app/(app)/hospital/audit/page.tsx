import AuditTable from "@/components/admin/AuditTable";
import PageHeader from "@/components/shell/PageHeader";
import { loadAudit } from "@/lib/auditView";
import { requirePage } from "@/lib/session";

export default async function HospitalAudit({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePage(["hospital_admin"]);
  return (
    <>
      <PageHeader title="Audit Log" description="Every create, edit, delete, approve and reject in your hospital. Entries cannot be edited or deleted." />
      <AuditTable rows={await loadAudit()} searchParams={await searchParams} basePath="/hospital/audit" />
    </>
  );
}
