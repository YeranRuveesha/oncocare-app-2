import Link from "next/link";
import ChangeRequestList from "@/components/admin/ChangeRequestList";
import ReviewButtons from "@/components/admin/ReviewButtons";
import DataTable from "@/components/data/DataTable";
import PageHeader from "@/components/shell/PageHeader";
import { pendingChangeRequests } from "@/lib/approvals";
import { ROLE_LABEL, fullName, type Role } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function HospitalApprovals({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePage(["hospital_admin"]);
  const supabase = await createUserClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("id, user_code, given_names, last_name, role, created_at, clinician_details(slmc_no, specialty, qualifications)")
    .eq("status", "pending_approval")
    .order("created_at");
  const requests = await pendingChangeRequests();
  type Row = { id: string; user_code: string; given_names: string; last_name: string; role: Role; created_at: string; clinician_details: { slmc_no: string; specialty: string; qualifications: string[] } | null };
  const rows = (pending ?? []) as unknown as Row[];
  const sp = await searchParams;

  return (
    <>
      <PageHeader title="Approvals" description="New clinician accounts and change requests from your patients and clinicians." />
      <h2 className="mb-3 font-display text-lg font-bold">Pending clinician accounts</h2>
      <DataTable
        rows={rows}
        rowKey={(c) => c.id}
        searchParams={sp}
        basePath="/hospital/approvals"
        prefix="acc_"
        defaultSort="date"
        searchPlaceholder="Search name, ID or SLMC number"
        empty="No clinicians are waiting."
        columns={[
          { key: "name", header: "Clinician", sortValue: (c) => fullName(c), searchText: (c) => `${fullName(c)} ${c.user_code}`, cell: (c) => (
            <div className="text-sm"><Link className="font-semibold hover:underline" href={`/hospital/clinicians/${c.id}`}>Dr {fullName(c)}</Link> <span className="font-mono text-xs text-muted-foreground">{c.user_code}</span></div>
          ) },
          { key: "role", header: "Role", sortValue: (c) => ROLE_LABEL[c.role], cell: (c) => <span className="text-sm">{ROLE_LABEL[c.role]} · {c.clinician_details?.specialty}</span>, searchText: (c) => `${c.clinician_details?.specialty ?? ""}` },
          { key: "slmc", header: "SLMC number", searchText: (c) => c.clinician_details?.slmc_no ?? "", cell: (c) => <span><b className="font-mono text-sm">{c.clinician_details?.slmc_no}</b> <span className="text-xs text-muted-foreground">(check before approving)</span></span> },
          { key: "date", header: "Sent", sortValue: (c) => new Date(c.created_at), cell: (c) => <span className="whitespace-nowrap text-xs">{new Date(c.created_at).toLocaleDateString("en-GB")}</span> },
          { key: "act", header: "Decision", cell: (c) => <ReviewButtons url={`/api/hospital/users/${c.id}/review`} approveLabel="Approve account" /> },
        ]}
      />
      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Change requests</h2>
      <ChangeRequestList items={requests} searchParams={sp} basePath="/hospital/approvals" />
    </>
  );
}
