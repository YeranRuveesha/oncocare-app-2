import BrandingForm from "@/components/admin/BrandingForm";
import HospitalNameRequest from "@/components/admin/HospitalNameRequest";
import PageHeader from "@/components/shell/PageHeader";
import { logoUrl } from "@/lib/media";
import { requirePage } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export default async function BrandingPage() {
  const s = await requirePage(["hospital_admin"]);
  const h = s.hospital!;
  const { data: pending } = await createServiceClient()
    .from("change_requests").select("new_value").eq("requester_id", s.userId).eq("field_name", "hospital_name").eq("status", "pending").maybeSingle();
  return (
    <>
      <PageHeader title="Hospital Branding" description="Your logo and colours appear in every menu for your hospital's patients, clinicians and admins." />
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground">Hospital name (locked)</p>
          <p className="font-display text-lg font-bold">{h.name}</p>
          <p className="text-xs text-muted-foreground">Code {h.code}</p>
        </div>
        <HospitalNameRequest current={h.name} pending={pending?.new_value ?? null} />
      </section>
      <BrandingForm name={h.name} logo={logoUrl(h.logo_path)} primary={h.primary_color} secondary={h.secondary_color} />
    </>
  );
}
