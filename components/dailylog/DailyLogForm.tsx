"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { concerning, cToF, dailyLogSchema, fToC, type DailyLogInput } from "@/lib/validation/dailyLog";
import { cn } from "@/lib/utils";

type Saved = Partial<DailyLogInput> & { id?: string };
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
    <h2 className="mb-4 font-display text-base font-bold text-ink">{title}</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </section>
);
const YesNo = ({ id, value, onChange, labels = ["Yes", "No"] }: { id: string; value: boolean; onChange: (v: boolean) => void; labels?: [string, string] }) => (
  <div className="flex gap-2" role="radiogroup" aria-labelledby={id}>
    {[true, false].map((b, i) => (
      <button key={String(b)} type="button" role="radio" aria-checked={value === b} onClick={() => onChange(b)}
        className={cn("h-11 flex-1 rounded-lg border text-sm font-medium", value === b ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>{labels[i]}</button>
    ))}
  </div>
);

/** One-screen daily log. Create, or edit for 24 hours (then it is shown read-only by the page). */
export default function DailyLogForm({ date, dayN, saved, late }: { date: string; dayN: number | null; saved: Saved | null; late: boolean }) {
  const router = useRouter();
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [f, setF] = useState({
    temp: s(saved?.temperature_c), hr: s(saved?.heart_rate), sys: s(saved?.bp_systolic), dia: s(saved?.bp_diastolic), spo2: s(saved?.spo2), weight: s(saved?.weight_kg),
    pain: saved?.pain ?? 0, fatigue: saved?.fatigue ?? 0, appetite: saved?.appetite ?? "Good", nausea: saved?.nausea ?? "None", vomit: s(saved?.vomiting_episodes ?? 0), loose: s(saved?.loose_stools ?? 0),
    bleeding: saved?.bleeding ?? false,
    brush: s(saved?.mouth_brushing ?? 0), floss: saved?.mouth_flossed ?? false, rinse: s(saved?.mouth_rinses ?? 0), lip: saved?.lip_care ?? false,
    emol: s(saved?.emollient_times ?? 0), sun: saved?.sun_protection ?? "No", walk: s(saved?.walking_minutes ?? 0), meds: saved?.medicines ?? "Yes", notes: saved?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const up = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const opt = (v: string) => (v.trim() === "" ? null : Number(v));

  function switchUnit(u: "C" | "F") {
    const n = Number(f.temp);
    if (Number.isFinite(n) && f.temp.trim() !== "") up({ temp: String(u === "F" ? cToF(n) : fToC(n)) });
    setUnit(u);
  }

  async function save() {
    setMsg(null);
    const tRaw = num(f.temp);
    const body = {
      ...(late || saved ? { log_date: date } : {}),
      temperature_c: unit === "F" && Number.isFinite(tRaw) ? fToC(tRaw) : tRaw,
      heart_rate: num(f.hr), bp_systolic: num(f.sys), bp_diastolic: num(f.dia), spo2: opt(f.spo2), weight_kg: opt(f.weight),
      pain: f.pain, fatigue: f.fatigue, appetite: f.appetite, nausea: f.nausea, vomiting_episodes: num(f.vomit), loose_stools: num(f.loose), bleeding: f.bleeding,
      mouth_brushing: num(f.brush), mouth_flossed: f.floss, mouth_rinses: num(f.rinse), lip_care: f.lip, emollient_times: num(f.emol), sun_protection: f.sun,
      walking_minutes: num(f.walk), medicines: f.meds, notes: f.notes.trim() || null,
    };
    const p = dailyLogSchema.safeParse(body);
    if (!p.success) {
      const e: Record<string, string> = {};
      for (const i of p.error.issues) e[String(i.path[0])] ||= i.message;
      setErrors(e); setMsg({ ok: false, t: "Please check the highlighted values." });
      return;
    }
    setErrors({}); setBusy(true);
    const res = await fetch(saved?.id ? `/api/daily-logs?id=${saved.id}` : "/api/daily-logs", { method: saved?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p.data) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErrors(j.errors ?? {}); setMsg({ ok: false, t: j.error ?? "Something went wrong." }); return; }
    setMsg({ ok: true, t: saved?.id ? "Changes saved." : "Daily log saved. Thank you!" });
    setWarn(concerning(p.data));
    router.refresh();
  }

  const liveWarn = concerning({ temperature_c: unit === "F" ? fToC(num(f.temp)) : num(f.temp), bleeding: f.bleeding, spo2: opt(f.spo2) });
  const shownWarn = warn ?? liveWarn;
  const slider = (key: "pain" | "fatigue", label: string) => (
    <Field id={key} label={`${label}: ${f[key]} / 10`}>
      <input id={key} type="range" min={0} max={10} value={f[key]} onChange={(e) => up({ [key]: Number(e.target.value) })} className="h-11 w-full accent-[#1B7A7E]" />
    </Field>
  );
  const n = (id: string, label: string, key: keyof typeof f, ph?: string, hint?: string, err = errors[id]) => (
    <Field id={id} label={label} error={err} hint={hint}>
      <Input id={id} inputMode="decimal" value={String(f[key])} onChange={(e) => up({ [key]: e.target.value })} placeholder={ph} className="h-11" aria-invalid={!!err} />
    </Field>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-4" noValidate>
      {late && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">You are adding a missed day. It will be marked as a late entry.</p>}
      {saved?.id && <p className="flex items-center gap-2 rounded-lg bg-ice p-3 text-sm text-ink"><Lock className="size-4" aria-hidden="true" /> You can change this log for 24 hours after you first saved it. Your earlier values are kept for your care team.</p>}
      {shownWarn && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="size-5 shrink-0" aria-hidden="true" /> {shownWarn} Please use Report Symptoms now.</p>
          <Button asChild variant="brand"><Link href="/patient/report">Report symptoms</Link></Button>
        </div>
      )}
      <Section title="Vitals">
        <Field id="temperature_c" label={`Temperature (°${unit})`} error={errors.temperature_c}>
          <div className="flex gap-2">
            <Input id="temperature_c" inputMode="decimal" value={f.temp} onChange={(e) => up({ temp: e.target.value })} placeholder={unit === "C" ? "36.8" : "98.2"} className="h-11" aria-invalid={!!errors.temperature_c} />
            <div className="flex overflow-hidden rounded-lg border" role="group" aria-label="Temperature unit">
              {(["C", "F"] as const).map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => switchUnit(u)} className={cn("w-11 text-sm font-semibold", unit === u ? "bg-primary text-primary-foreground" : "bg-white")}>°{u}</button>)}
            </div>
          </div>
        </Field>
        {n("heart_rate", "Heart rate (beats per minute)", "hr", "72")}
        <div className="grid grid-cols-2 gap-2">
          {n("bp_systolic", "BP top (systolic)", "sys", "120")}
          {n("bp_diastolic", "BP bottom (diastolic)", "dia", "80")}
        </div>
        {n("spo2", "Oxygen level SpO₂ % (optional)", "spo2", "97")}
        {n("weight_kg", "Weight kg (optional)", "weight", "58.5")}
      </Section>
      <Section title="How I feel">
        {slider("pain", "Pain")}
        {slider("fatigue", "Tiredness")}
        <Field id="appetite" label="Appetite"><NativeSelect id="appetite" value={f.appetite} onChange={(e) => up({ appetite: e.target.value as typeof f.appetite })} className="h-11">{["Good", "Reduced", "Poor"].map((o) => <option key={o}>{o}</option>)}</NativeSelect></Field>
        <Field id="nausea" label="Nausea"><NativeSelect id="nausea" value={f.nausea} onChange={(e) => up({ nausea: e.target.value as typeof f.nausea })} className="h-11">{["None", "Mild", "Severe"].map((o) => <option key={o}>{o}</option>)}</NativeSelect></Field>
        {n("vomiting_episodes", "Times you vomited today", "vomit")}
        {n("loose_stools", "Loose stools (diarrhoea) today", "loose")}
        <div><p id="bleed" className="mb-1 text-sm font-semibold">Any bleeding or bruising?</p><YesNo id="bleed" value={f.bleeding} onChange={(v) => up({ bleeding: v })} /></div>
      </Section>
      <Section title="Self-care">
        {n("mouth_brushing", "Teeth brushed (times)", "brush", undefined, "Aim for 2 to 3")}
        {n("mouth_rinses", "Mouth rinses (times)", "rinse", undefined, "Aim for 4")}
        <div><p id="floss" className="mb-1 text-sm font-semibold">Flossed?</p><YesNo id="floss" value={f.floss} onChange={(v) => up({ floss: v })} /></div>
        <div><p id="lip" className="mb-1 text-sm font-semibold">Lip care done?</p><YesNo id="lip" value={f.lip} onChange={(v) => up({ lip: v })} /></div>
        {n("emollient_times", "Moisturiser (emollient) times", "emol", undefined, "0 to 3 or more")}
        <Field id="sun" label="Sun protection"><NativeSelect id="sun" value={f.sun} onChange={(e) => up({ sun: e.target.value as typeof f.sun })} className="h-11">{["Yes", "No", "Stayed indoors"].map((o) => <option key={o}>{o}</option>)}</NativeSelect></Field>
        {n("walking_minutes", "Walking (minutes)", "walk", undefined, "Increase slowly, based on how much energy you have")}
        <Field id="meds" label="Medicines taken as prescribed"><NativeSelect id="meds" value={f.meds} onChange={(e) => up({ meds: e.target.value as typeof f.meds })} className="h-11">{["Yes", "Partly", "No"].map((o) => <option key={o}>{o}</option>)}</NativeSelect></Field>
      </Section>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-semibold">Notes (optional, {500 - f.notes.length} left)</label>
        <Textarea id="notes" rows={3} maxLength={500} value={f.notes} onChange={(e) => up({ notes: e.target.value })} />
        {errors.notes && <p role="alert" className="mt-1 text-xs text-destructive">{errors.notes}</p>}
        <p className="mt-1 text-xs text-muted-foreground">Please do not type your name, phone number or address.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" variant="brand" disabled={busy}>{busy ? "Saving…" : saved?.id ? "Save changes" : "Save today's log"}</Button>
        {msg && <p role="status" className={cn("text-sm font-medium", msg.ok ? "text-emerald-700" : "text-destructive")}>{msg.t}</p>}
      </div>
    </form>
  );
}
