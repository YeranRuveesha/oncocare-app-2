import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import DataTable from "@/components/data/DataTable";
import { StatusBadge } from "@/components/profile/ProfileClient";
import PageHeader from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { DIAGNOSES } from "@/lib/options";
import { ROLE_LABEL, STATUS_LABEL, fullName, type AccountStatus, type Role } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

type Kind = "patients" | "clinicians";

export default async function PeopleList({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { kind } = await params;
  if (kind !== "patients" && kind !== "clinicians") notFound();
  await requirePage(["hospital_admin"]);
  const sp = await searchParams;
  const supabase = await createUserClient(); // RLS: only this hospital's people

  const select =
    kind === "patients"
      ? "id, user_code, given_names, last_name, status, role, created_at, patient_details!patient_details_profile_id_fkey!inner(diagnosis, transplant_date)"
      : "id, user_code, given_names, last_name, status, role, created_at, clinician_details!inner(slmc_no, specialty)";
  let query = supabase.from("profiles").select(select).order("last_name").limit(2000);
  query = kind === "patients" ? query.eq("role", "patient") : query.in("role", ["junior_doctor", "senior_consultant"]);
  const { data, error } = await query;
  type Row = {
    id: string; user_code: string; given_names: string; last_name: string; status: AccountStatus; role: Role; created_at: string;
    patient_details?: { diagnosis: string } | { diagnosis: string }[];
    clinician_details?: { slmc_no: string; specialty: string } | { slmc_no: string; specialty: string }[];
  };
  const rows = (data ?? []) as unknown as Row[];
  const one = <T,>(x: T | T[] | undefined) => (Array.isArray(x) ? x[0] : x);
  const title = kind === "patients" ? "Patients" : "Clinicians";
  const third = (r: Row) => (kind === "patients" ? one(r.patient_details)?.diagnosis ?? "" : `${ROLE_LABEL[r.role]} · ${one(r.clinician_details)?.specialty ?? ""}`);

  return (
    <>
      <PageHeader
        title={title}
        description={kind === "patients" ? "Patients of your hospital." : "Doctors of your hospital. Pending accounts need your approval."}
        actions={
          <Button asChild variant="brand">
            <Link href={`/hospital/${kind}/new`}><Plus /> Add {kind === "patients" ? "patient" : "clinician"}</Link>
          </Button>
        }
      />
      {error && <p className="mb-3 text-sm text-crimson">{error.message}</p>}
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        searchParams={sp}
        basePath={`/hospital/${kind}`}
        defaultSort="name"
        searchPlaceholder="Search name or User ID"
        empty={`No ${kind} found.`}
        rowHref={(r) => `/hospital/${kind}/${r.id}`}
        filters={[
          { key: "status", label: "Status", options: (Object.keys(STATUS_LABEL) as AccountStatus[]).map((x) => ({ value: x, label: STATUS_LABEL[x] })), match: (r, v) => r.status === v },
          kind === "patients"
            ? { key: "diagnosis", label: "Diagnosis", options: DIAGNOSES.map((d) => ({ value: d, label: d })), match: (r, v) => one(r.patient_details)?.diagnosis === v }
            : { key: "role", label: "Role", options: [{ value: "junior_doctor", label: "Junior Doctor" }, { value: "senior_consultant", label: "Senior Consultant" }], match: (r, v) => r.role === v },
        ]}
        columns={[
          { key: "name", header: "Name", sortValue: (r) => fullName(r), searchText: (r) => fullName(r), cell: (r) => fullName(r) },
          { key: "code", header: "User ID", sortValue: (r) => r.user_code, searchText: (r) => r.user_code, cell: (r) => <span className="font-mono text-xs">{r.user_code}</span> },
          { key: "third", header: kind === "patients" ? "Diagnosis" : "Role", sortValue: third, searchText: third, cell: third },
          { key: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </>
  );
}
