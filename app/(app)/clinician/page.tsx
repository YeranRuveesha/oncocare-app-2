import PageHeader, { StatCard } from "@/components/shell/PageHeader";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function ClinicianDashboard() {
  const s = await requirePage(["junior_doctor", "senior_consultant"]);
  const senior = s.profile.role === "senior_consultant";
  const supabase = await createUserClient(); // RLS: my hospital only
  const tiers = senior ? ["urgent", "emergency"] : ["routine"];
  const c = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [open, emergency, mine] = await Promise.all([
    c(supabase.from("triage_alerts").select("id", { count: "exact", head: true }).in("tier", tiers).neq("status", "resolved")),
    c(supabase.from("triage_alerts").select("id", { count: "exact", head: true }).eq("tier", "emergency").neq("status", "resolved")),
    c(supabase.from("patient_details").select("profile_id", { count: "exact", head: true }).eq("assigned_doctor_id", s.userId)),
  ]);
  return (
    <>
      <PageHeader title={`Welcome, Dr ${s.profile.last_name}`} description={senior ? "You see the URGENT queue (urgent + emergency check-ins)." : "You see the ROUTINE queue."} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Open in my ${senior ? "urgent" : "routine"} queue`} value={open} href="/clinician/triage" tone={open ? "warn" : "default"} />
        <StatCard label="Open emergencies (hospital)" value={emergency} tone={emergency ? "warn" : "good"} />
        <StatCard label="My assigned patients" value={mine} href="/clinician/patients" />
      </div>
    </>
  );
}
