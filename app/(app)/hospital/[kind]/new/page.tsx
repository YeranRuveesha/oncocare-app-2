import { notFound } from "next/navigation";
import CreatePerson from "@/components/admin/CreatePerson";
import PageHeader from "@/components/shell/PageHeader";
import { requirePage } from "@/lib/session";

export default async function NewPerson({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== "patients" && kind !== "clinicians") notFound();
  const s = await requirePage(["hospital_admin"]);
  return (
    <>
      <PageHeader
        title={kind === "patients" ? "Add a patient" : "Add a clinician"}
        description="Same fields as the sign-up form. The system creates the User ID and emails an invite. You never see or set their password."
      />
      <CreatePerson kind={kind} hospitalId={s.profile.hospital_id!} />
    </>
  );
}
