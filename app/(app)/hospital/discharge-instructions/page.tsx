import DataTable from "@/components/data/DataTable";
import DischargeEditor from "@/components/discharge/DischargeEditor";
import PageHeader from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/badge";
import { loadActiveDischarge, type DischargeDoc } from "@/lib/discharge";
import { fullName } from "@/lib/roles";
import { requirePage } from "@/lib/session";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

export default async function HospitalDischarge({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requirePage(["hospital_admin"]);
  const sp = await searchParams;
  const doc = await loadActiveDischarge(s.profile.hospital_id);
  const supabase = await createUserClient();
  const { data: versions } = await supabase.from("discharge_instructions").select("id, version, title, is_active, updated_at, updated_by, pdf_path").eq("hospital_id", s.profile.hospital_id!).order("version", { ascending: false });
  const db = createServiceClient();
  const ids = (versions ?? []).map((v) => v.id);
  const [{ data: acks }, { data: people }, { count: patients }] = await Promise.all([
    ids.length ? db.from("discharge_acknowledgements").select("instruction_id").in("instruction_id", ids) : Promise.resolve({ data: [] as { instruction_id: string }[] }),
    db.from("profiles").select("id, given_names, last_name").in("id", [...new Set((versions ?? []).map((v) => v.updated_by).filter(Boolean))] as string[]),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", s.profile.hospital_id!).eq("role", "patient").eq("status", "active"),
  ]);
  const ackCount = new Map<string, number>();
  for (const a of acks ?? []) ackCount.set(a.instruction_id, (ackCount.get(a.instruction_id) ?? 0) + 1);
  const who = new Map((people ?? []).map((p) => [p.id, fullName(p)]));
  const hasOwn = Boolean(doc?.hospital_id);
  return (
    <>
      <PageHeader title="Discharge Instructions" description={hasOwn ? "Your hospital's instructions. Each save creates a new version and patients confirm it again." : "Patients currently see the general platform guidance. Edit it below and publish to make it your hospital's own version."} />
      {doc && <DischargeEditor doc={doc as DischargeDoc} hasOwn={hasOwn} />}
      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Versions</h2>
      <DataTable
        rows={versions ?? []}
        rowKey={(v) => v.id}
        searchParams={sp}
        basePath="/hospital/discharge-instructions"
        defaultSort="version"
        defaultDir="desc"
        empty="No hospital version yet. Publish one above."
        columns={[
          { key: "version", header: "Version", sortValue: (v) => v.version, cell: (v) => <>v{v.version} {v.is_active && <Badge variant="secondary">Active</Badge>}</> },
          { key: "title", header: "Title", cell: (v) => <span className="text-sm">{v.title}</span> },
          { key: "date", header: "Published", sortValue: (v) => new Date(v.updated_at), cell: (v) => <span className="text-xs">{new Date(v.updated_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span> },
          { key: "by", header: "By", cell: (v) => <span className="text-xs">{v.updated_by ? who.get(v.updated_by) ?? "—" : "—"}</span> },
          { key: "ack", header: "Confirmed by patients", cell: (v) => <span className="text-xs tabular-nums">{ackCount.get(v.id) ?? 0}{v.is_active ? ` of ${patients ?? 0} active` : ""}</span> },
        ]}
      />
    </>
  );
}
