import DischargeView from "@/components/discharge/DischargeView";
import PageHeader, { Empty } from "@/components/shell/PageHeader";
import { loadActiveDischarge } from "@/lib/discharge";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function PatientDischarge() {
  const s = await requirePage(["patient"]);
  const doc = await loadActiveDischarge(s.profile.hospital_id);
  if (!doc) return <><PageHeader title="Discharge Instructions" /><Empty>Your hospital has not added discharge instructions yet.</Empty></>;
  const supabase = await createUserClient();
  const { data: ack } = await supabase.from("discharge_acknowledgements").select("confirmed_at").eq("instruction_id", doc.id).eq("patient_id", s.userId).maybeSingle();
  return (
    <>
      <PageHeader title="Discharge Instructions" description={`${doc.title} · version ${doc.version}${doc.hospital_id ? "" : " (general guidance, your hospital may add its own)"}`} />
      <DischargeView doc={doc} acknowledgedAt={ack?.confirmed_at ?? null} canAcknowledge />
    </>
  );
}
