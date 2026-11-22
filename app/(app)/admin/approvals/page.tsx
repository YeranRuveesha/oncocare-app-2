import ChangeRequestList from "@/components/admin/ChangeRequestList";
import PageHeader from "@/components/shell/PageHeader";
import { pendingChangeRequests } from "@/lib/approvals";
import { requirePage } from "@/lib/session";

export default async function AdminApprovals({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePage(["platform_admin"]);
  return (
    <>
      <PageHeader title="Approvals" description="Change requests from Hospital Admins (including hospital name changes) and from other Admins. You never review your own." />
      <ChangeRequestList items={await pendingChangeRequests()} searchParams={await searchParams} basePath="/admin/approvals" />
    </>
  );
}
