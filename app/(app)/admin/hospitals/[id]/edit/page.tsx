import { notFound } from "next/navigation";
import HospitalForm from "@/components/admin/HospitalForm";
import PageHeader from "@/components/shell/PageHeader";
import { logoUrl } from "@/lib/media";
import { requirePage } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export default async function EditHospital({ params }: { params: Promise<{ id: string }> }) {
  await requirePage(["platform_admin"]);
  const { id } = await params;
  const { data: h } = await createServiceClient().from("hospitals").select("*").eq("id", id).maybeSingle();
  if (!h) notFound();
  const keys = ["name", "short_name", "registration_no", "type", "address_line", "city", "district", "country", "email", "phone", "primary_color", "secondary_color"];
  const initial = Object.fromEntries(keys.map((k) => [k, String(h[k] ?? "")]));
  return (
    <>
      <PageHeader title={`Edit ${h.name}`} />
      <HospitalForm mode="edit" hospitalId={id} initial={initial} logo={logoUrl(h.logo_path)} code={h.code} />
    </>
  );
}
