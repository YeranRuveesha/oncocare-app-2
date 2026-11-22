import PageHeader, { StatCard } from "@/components/shell/PageHeader";
import { requirePage } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  await requirePage(["platform_admin"]);
  const db = createServiceClient();
  const c = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [total, active, awaiting, deactivated, admins] = await Promise.all([
    c(db.from("hospitals").select("id", { count: "exact", head: true })),
    c(db.from("hospitals").select("id", { count: "exact", head: true }).eq("status", "active")),
    c(db.from("hospitals").select("id", { count: "exact", head: true }).eq("status", "awaiting_admin_setup")),
    c(db.from("hospitals").select("id", { count: "exact", head: true }).eq("status", "deactivated")),
    c(db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "hospital_admin").neq("status", "deactivated")),
  ]);
  return (
    <>
      <PageHeader title="Platform Dashboard" description="Hospital-level information only. Patient and clinician records are never shown to the Admin." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total hospitals" value={total} href="/admin/hospitals" />
        <StatCard label="Active hospitals" value={active} tone="good" href="/admin/hospitals?status=active" />
        <StatCard label="Awaiting admin setup" value={awaiting} tone={awaiting ? "warn" : "default"} href="/admin/hospitals?status=awaiting_admin_setup" />
        <StatCard label="Deactivated hospitals" value={deactivated} href="/admin/hospitals?status=deactivated" />
        <StatCard label="Hospital Admins" value={admins} href="/admin/hospital-admins" />
      </div>
    </>
  );
}
