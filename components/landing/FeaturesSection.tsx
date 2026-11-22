"use client";

import { Activity, BellRing, ClipboardList, ShieldCheck, Thermometer } from "lucide-react";
import Reveal from "./Reveal";

const PILLARS = [
  { icon: Activity, title: "Daily check-ins", text: "Patients log temperature and how they feel in under a minute." },
  { icon: BellRing, title: "Symptom reporting", text: "Simple three-step reports, with a photo or a spoken note if needed." },
  { icon: ClipboardList, title: "Clinician triage", text: "Red-flag rules run first, then reports are sorted into routine, urgent or emergency for the care team." },
  { icon: ShieldCheck, title: "Secure by design", text: "Email, phone and authenticator checks, and each hospital's data kept apart." },
];

/** A made-up phone screen. All values are fake and only for illustration. */
function PhoneMock() {
  return (
    <div className="oc-anim oc-float mx-auto w-[250px] rounded-[2.2rem] border-[7px] border-ink bg-white p-3 shadow-xl" role="img" aria-label="Illustration of the patient app with example data">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink/20" />
      <p className="text-[11px] font-semibold text-[#1B7A7E]">Good morning · Day +14</p>
      <div className="mt-2 rounded-xl bg-ice p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink"><Thermometer className="size-4 text-[#1B7A7E]" aria-hidden="true" /> Temperature</div>
        <div className="mt-1 font-display text-2xl font-extrabold text-ink">36.8 °C</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="oc-anim h-full w-1/2 rounded-full bg-[#1B7A7E]" style={{ animation: "oc-fade-up 2s ease infinite alternate" }} />
        </div>
      </div>
      <div className="mt-2 rounded-xl border p-3">
        <p className="text-xs font-semibold text-ink">Today&apos;s checklist</p>
        {["Took morning medicines", "Mouth care", "Drank 2 litres"].map((t, i) => (
          <div key={t} className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-600">
            <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
              <circle cx="8" cy="8" r="7" fill="#1B7A7E" opacity="0.15" />
              <path d="M4.5 8.5l2.4 2.4L11.5 6" fill="none" stroke="#1B7A7E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="oc-tick" style={{ "--d": `${i * 0.6}s` } as React.CSSProperties} />
            </svg>
            {t}
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-xl bg-[#1B7A7E] p-2.5 text-center text-xs font-semibold text-white">Report a symptom</div>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-ice py-16 sm:py-20" aria-labelledby="features-h">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Reveal>
            <h2 id="features-h" className="font-display text-2xl font-extrabold text-ink sm:text-3xl">How OncoCare BMT helps</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">One simple place for patients to report how they are, and for the hospital team to see who needs attention first.</p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90} className="rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <span className="grid size-10 place-items-center rounded-lg bg-[#1B7A7E]/10 text-[#1B7A7E]"><p.icon className="size-5" aria-hidden="true" /></span>
                <h3 className="mt-3 font-display text-base font-bold text-ink">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-6 rounded-lg border-l-4 border-[#1B7A7E] bg-white px-4 py-3 text-sm font-medium text-ink">
            The AI helps sort reports so urgent ones are seen sooner. It does not diagnose, and it never replaces your doctor.
          </Reveal>
        </div>
        <Reveal><PhoneMock /></Reveal>
      </div>
    </section>
  );
}
