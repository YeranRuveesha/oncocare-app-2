import ProgressCharts from "@/components/progress/ProgressCharts";
import RangeButtons from "@/components/progress/RangeButtons";
import PageHeader, { StatCard } from "@/components/shell/PageHeader";
import { loadProgress } from "@/lib/progress";
import { requirePage } from "@/lib/session";
import { createUserClient } from "@/lib/supabase/server";

export default async function MyProgress({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const s = await requirePage(["patient"]);
  const supabase = await createUserClient();
  const { progress: p, range } = await loadProgress(supabase, s.userId, await searchParams);
  const sm = p.summary;
  const none = !p.days.some((d) => d.temp !== null);
  return (
    <>
      <PageHeader title="My Progress" description="What you recorded, over time." />
      <RangeButtons basePath="/patient/progress" active={range.key} from={range.from} to={range.to} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Day after transplant" value={sm.dayN !== null ? `+${sm.dayN}` : "—"} />
        <StatCard label="Logs this week" value={`${sm.logsThisWeek} of 7`} />
        <StatCard label="Average temperature" value={sm.avgTemp !== null ? `${sm.avgTemp} °C` : "—"} />
        <StatCard label="Latest BP / heart rate" value={sm.bp ? `${sm.bp}${sm.hr ? ` · ${sm.hr}` : ""}` : "—"} />
        <StatCard label="Exercise completion" value={sm.exercisePct !== null ? `${sm.exercisePct}%` : "—"} />
        <StatCard label="Symptom reports" value={sm.reports} />
      </div>
      {none && <p className="mb-4 rounded-xl border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">No data yet. Add your first daily log and your charts will appear here.</p>}
      <ProgressCharts data={p} />
    </>
  );
}
