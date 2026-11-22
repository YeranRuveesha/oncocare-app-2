import PageHeader, { StatCard } from "@/components/shell/PageHeader";
import { requirePage } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export default async function HospitalDashboard() {
  const s = await requirePage(["hospital_admin"]);
  const h = s.profile.hospital_id!;
  const db = createServiceClient();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [patients, clinicians, pendingClinicians, pendingRequests] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", h).eq("role", "patient").neq("status", "deactivated")),
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", h).in("role", ["junior_doctor", "senior_consultant"]).neq("status", "deactivated")),
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", h).eq("status", "pending_approval")),
    count(db.from("change_requests").select("id", { count: "exact", head: true }).eq("hospital_id", h).eq("status", "pending").in("requester_role", ["patient", "junior_doctor", "senior_consultant"])),
  ]);
  return (
    <>
      <PageHeader title="Dashboard" description={`${s.hospital?.name} · hospital code ${s.hospital?.code}`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total patients" value={patients} href="/hospital/patients" />
        <StatCard label="Total clinicians" value={clinicians} href="/hospital/clinicians" />
        <StatCard label="Pending clinician approvals" value={pendingClinicians} tone={pendingClinicians ? "warn" : "default"} href="/hospital/approvals" />
        <StatCard label="Pending change requests" value={pendingRequests} tone={pendingRequests ? "warn" : "default"} href="/hospital/approvals" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Hospital Admins manage accounts only. Daily symptom logs and triage reports are visible to clinicians, not here.
      </p>
    </>
  );
}
