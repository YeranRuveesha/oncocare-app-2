import HospitalForm from "@/components/admin/HospitalForm";
import PageHeader from "@/components/shell/PageHeader";
import { requirePage } from "@/lib/session";

export default async function NewHospital() {
  await requirePage(["platform_admin"]);
  return (
    <>
      <PageHeader title="Create hospital" description="Step 1: hospital details and branding. Step 2: the first Hospital Admin, who gets a User ID and a one-time temporary password." />
      <HospitalForm mode="create" />
    </>
  );
}
