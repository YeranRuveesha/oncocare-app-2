"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, ChevronDown, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { ONSETS, SEVERITIES, SYMPTOM_RULES, type Onset, type Severity, type Tier } from "@/config/triage-rules";
import { cn } from "@/lib/utils";

interface Picked { severity: Severity; onset: Onset; flag: boolean }
interface Result { id: string; tier: Tier; reasons: string[]; redFlags: string[]; steps: { title: string; steps: string[] } }

const TIER_STYLE: Record<Tier, string> = { emergency: "border-crimson bg-red-50 text-crimson", urgent: "border-amber-400 bg-amber-50 text-amber-900", routine: "border-emerald-400 bg-emerald-50 text-emerald-900" };
const TIER_LABEL: Record<Tier, string> = { emergency: "Emergency", urgent: "Urgent", routine: "Routine" };

type SR = { start(): void; stop(): void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export default function ReportWizard({ callList, defaultTemp }: { callList: string[]; defaultTemp: number | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  const [temp, setTemp] = useState(defaultTemp !== null ? String(defaultTemp) : "");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [listening, setListening] = useState(false);
  const rec = useRef<SR | null>(null);
  const hasSpeech = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const toggle = (key: string) => setPicked((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = { severity: "mild", onset: "today", flag: false }; return n; });
  const set = (key: string, patch: Partial<Picked>) => setPicked((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  function voice() {
    if (listening) { rec.current?.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return;
    const r = new C();
    r.lang = "en-GB"; r.interimResults = false; r.continuous = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      setNotes((n) => (n ? n.trimEnd() + " " : "") + text.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  }

  async function submit() {
    const e: Record<string, string> = {};
    const keys = Object.keys(picked);
    if (!keys.length) e.symptoms = "Please choose at least one symptom";
    const t = temp.trim() === "" ? undefined : Number(temp);
    if (t !== undefined && (!Number.isFinite(t) || t < 34 || t > 42)) e.temp = "Please check this value (34.0 to 42.0 °C)";
    if (picked.other && !notes.trim()) e.notes = "Please describe the other symptom";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const f = new FormData();
    f.set("payload", JSON.stringify({ symptoms: keys.map((k) => ({ key: k, severity: picked[k].severity, onset: picked[k].onset, ...(picked[k].flag ? { flag: true } : {}) })), temperatureC: t, notes: notes.trim() || undefined }));
    if (photo && picked.rash) f.set("photo", photo);
    const res = await fetch("/api/reports", { method: "POST", body: f });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErrors({ form: j.error ?? "Something went wrong. If it is urgent, call your transplant unit." }); return; }
    setResult(j); setStep(3); router.refresh();
  }

  const steps = ["Reminder", "Symptoms", "Result"];
  return (
    <div>
      <ol className="mb-5 flex gap-2 text-xs font-semibold" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={cn("flex-1 rounded-full px-3 py-1.5 text-center", step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <div role="alert" className="flex gap-3 rounded-xl border-2 border-crimson bg-red-50 p-4 text-crimson">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold">If you have trouble breathing, severe bleeding, or you feel very unwell, call emergency services (1990) or go to the nearest hospital now.</p>
          </div>
          <details className="rounded-xl border bg-white p-4 shadow-sm" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-display font-bold text-ink [&::-webkit-details-marker]:hidden">Your discharge instructions: when to call the doctor <ChevronDown className="size-4" aria-hidden="true" /></summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{callList.map((c) => <li key={c}>{c}</li>)}</ul>
            <Link href="/patient/discharge-instructions" className="mt-3 inline-block text-sm font-semibold text-primary underline">Read all discharge instructions</Link>
          </details>
          <Button size="lg" variant="brand" className="w-full sm:w-auto" onClick={() => setStep(2)}>Continue <ArrowRight /></Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 font-display text-lg font-bold">What are you feeling?</legend>
            <p className="mb-3 text-sm text-muted-foreground">Tick everything that applies.</p>
            <div className="space-y-2">
              {SYMPTOM_RULES.map((s) => {
                const p = picked[s.key];
                return (
                  <div key={s.key} className={cn("rounded-xl border bg-white p-3 shadow-sm", p && "border-primary")}>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3">
                      <input type="checkbox" className="mt-1 size-5 shrink-0" checked={Boolean(p)} onChange={() => toggle(s.key)} />
                      <span><span className="block text-sm font-semibold text-ink">{s.label}</span>
                        <span className="block text-xs text-muted-foreground">{s.help} <Link href="/patient/discharge-instructions#sec-call" className="underline">Discharge advice</Link></span></span>
                    </label>
                    {p && (
                      <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">How bad?</p>
                          <div className="flex gap-1.5" role="radiogroup" aria-label={`Severity of ${s.label}`}>
                            {SEVERITIES.map((o) => (
                              <button key={o.value} type="button" role="radio" aria-checked={p.severity === o.value} onClick={() => set(s.key, { severity: o.value })}
                                className={cn("h-11 flex-1 rounded-lg border text-sm font-medium", p.severity === o.value ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>{o.label}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-muted-foreground" htmlFor={`on-${s.key}`}>When did it start?</label>
                          <NativeSelect id={`on-${s.key}`} value={p.onset} onChange={(e) => set(s.key, { onset: e.target.value as Onset })} className="h-11">
                            {ONSETS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </NativeSelect>
                        </div>
                        {s.flagQuestion && (
                          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="size-5" checked={p.flag} onChange={(e) => set(s.key, { flag: e.target.checked })} /> {s.flagQuestion}</label>
                        )}
                        {s.photo && (
                          <div className="sm:col-span-2">
                            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 text-sm text-primary hover:bg-muted">
                              <Camera className="size-5" aria-hidden="true" /> {photo ? photo.name : "Take or choose a photo of the rash (optional, max 2 MB)"}
                              <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                            </label>
                            <p className="mt-1 text-xs text-muted-foreground">Only your care team can see it. Location data is removed.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.symptoms && <p role="alert" className="mt-2 text-sm font-medium text-destructive">{errors.symptoms}</p>}
          </fieldset>

          <div>
            <label htmlFor="temp" className="mb-1 block text-sm font-semibold">Temperature (°C)</label>
            <Input id="temp" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="e.g. 37.2" className="h-11 max-w-40" aria-invalid={!!errors.temp} />
            {defaultTemp !== null && <p className="mt-1 text-xs text-muted-foreground">Filled in from today&apos;s daily log. You can change it.</p>}
            {errors.temp && <p role="alert" className="mt-1 text-sm text-destructive">{errors.temp}</p>}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="notes" className="text-sm font-semibold">More details (optional)</label>
              {hasSpeech && <Button type="button" size="sm" variant="outline" onClick={voice} aria-pressed={listening}>{listening ? <><MicOff /> Stop</> : <><Mic /> Speak</>}</Button>}
            </div>
            <Textarea id="notes" rows={4} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} aria-invalid={!!errors.notes} />
            {listening && <p className="mt-1 text-xs text-muted-foreground">Listening… your browser&apos;s speech service turns your voice into text.</p>}
            {errors.notes && <p role="alert" className="mt-1 text-sm text-destructive">{errors.notes}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Please do not type your name, phone number or address.</p>
          </div>

          {errors.form && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-crimson">{errors.form}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}><ArrowLeft /> Back</Button>
            <Button variant="brand" size="lg" onClick={submit} disabled={busy}>{busy ? "Checking…" : "Send report"}</Button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-4" aria-live="polite">
          {result.tier === "emergency" && (
            <div role="alert" className="flex gap-3 rounded-xl border-2 border-crimson bg-red-50 p-4 text-crimson">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-bold">Call the ambulance (1990) or go to the nearest hospital now.</p>
            </div>
          )}
          <div className={cn("rounded-xl border-2 p-5", TIER_STYLE[result.tier])}>
            <p className="text-xs font-bold uppercase tracking-wide">Urgency: {TIER_LABEL[result.tier]}</p>
            <h2 className="mt-1 font-display text-xl font-extrabold">{result.steps.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.steps.steps.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div className="rounded-xl border bg-white p-4 text-sm">
            <p className="font-semibold">Why we chose this</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <p className="text-xs text-muted-foreground">This is guidance to help your care team prioritise. It is not a diagnosis.</p>
          <Button variant="outline" onClick={() => { setStep(1); setPicked({}); setNotes(""); setPhoto(null); setResult(null); }}>Send another report</Button>
        </div>
      )}
    </div>
  );
}
