import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import AddStaffForm from "@/components/admin/AddStaffForm";
import BrandPreview from "@/components/admin/BrandPreview";
import ConfirmAction from "@/components/admin/ConfirmAction";
import HospitalStatusBadge from "@/components/admin/HospitalStatusBadge";
import StaffActions from "@/components/admin/StaffActions";
import { StatusBadge } from "@/components/profile/ProfileClient";
import PageHeader, { StatCard } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { logoUrl } from "@/lib/media";
import { fullName, type HospitalStatus } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export default async function HospitalDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePage(["platform_admin"]);
  const { id } = await params;
  const db = createServiceClient();
  const { data: h } = await db.from("hospitals").select("*").eq("id", id).maybeSingle();
  if (!h) notFound();
  const c = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  // COUNTS only: the Admin never sees patient or clinician records.
  const [patients, clinicians, pending] = await Promise.all([
    c(db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", id).eq("role", "patient")),
    c(db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", id).in("role", ["junior_doctor", "senior_consultant"])),
    c(db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", id).eq("status", "pending_approval")),
  ]);
  const { data: admins } = await db
    .from("profiles")
    .select("id, user_code, given_names, last_name, email, job_title, status, is_primary_admin, activated_at")
    .eq("hospital_id", id)
    .eq("role", "hospital_admin")
    .order("created_at");

  return (
    <>
      <p className="mb-2 text-sm"><Link className="text-primary hover:underline" href="/admin/hospitals">← Hospitals</Link></p>
      <PageHeader
        title={h.name}
        description={<span className="flex flex-wrap items-center gap-2">Code <b className="font-mono">{h.code}</b> · <HospitalStatusBadge status={h.status as HospitalStatus} /></span>}
        actions={<Button asChild variant="outline"><Link href={`/admin/hospitals/${id}/edit`}><Pencil /> Edit</Link></Button>}
      />
      {h.status_reason && <div className="mb-4"><FormAlert kind="warning">Deactivated: {h.status_reason}</FormAlert></div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Patients" value={patients} />
        <StatCard label="Clinicians" value={clinicians} />
        <StatCard label="Pending approvals" value={pending} tone={pending ? "warn" : "default"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]">
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-display text-base font-bold">Details</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Short name", h.short_name], ["Registration / licence", h.registration_no], ["Type", h.type],
              ["Address", `${h.address_line}, ${h.city}, ${h.district}, ${h.country}`], ["Email", h.email], ["Telephone", h.phone],
              ["Created", new Date(h.created_at).toLocaleDateString("en-GB")],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </section>
        <BrandPreview name={h.name} logo={logoUrl(h.logo_path)} primary={h.primary_color} secondary={h.secondary_color} />
      </div>

      <section className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Hospital Admins</h2>
          {h.status !== "deactivated" && <AddStaffForm kind="hospital_admin" hospitalId={id} />}
        </div>
        {(admins ?? []).map((a) => (
          <div key={a.id} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{fullName(a)}</span>
              <span className="font-mono text-xs text-muted-foreground">{a.user_code}</span>
              <span className="text-muted-foreground">{a.job_title}</span>
              <StatusBadge status={a.status} />
              {a.is_primary_admin && <Badge variant="secondary">Main admin</Badge>}
            </div>
            <StaffActions url={`/api/admin/hospital-admins/${a.id}`} status={a.status} activated={Boolean(a.activated_at)} isPrimary={a.is_primary_admin} canMakePrimary email={a.email} />
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-xl border border-red-200 bg-white p-5">
        <h2 className="mb-2 font-display text-base font-bold">Hospital status</h2>
        {h.status === "deactivated" ? (
          <ConfirmAction url={`/api/admin/hospitals/${id}/status`} body={{ action: "reactivate" }} label="Reactivate hospital" title="Reactivate this hospital" />
        ) : (
          <ConfirmAction
            url={`/api/admin/hospitals/${id}/status`}
            body={{ action: "deactivate" }}
            label="Deactivate hospital"
            variant="destructive"
            danger
            title="Deactivate this hospital"
            description="ALL its users are logged out and cannot log in. Nothing is deleted, and you can reactivate later."
            confirmText={h.name}
          />
        )}
      </section>
    </>
  );
}
