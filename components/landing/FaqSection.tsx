import { ChevronDown } from "lucide-react";
import { SITE } from "@/config/site";
import Reveal from "./Reveal";

// TODO: clinician review before launch (educational medical content).
const FAQ = [
  { q: "Is OncoCare BMT a real medical service?", a: "No. It is a student demo. It does not give medical advice, and it must only be used with made-up people and data." },
  { q: "Does the AI diagnose me?", a: "No. Fixed safety rules look at your report first. The AI can only raise the urgency of a report, never lower it, and a clinician makes every decision." },
  { q: "Is the data on this site real?", a: "No. All patients, readings and messages here are simulated. Please do not enter real health or personal details." },
  { q: "What should I do in an emergency?", a: `Call the ambulance on ${SITE.ambulanceNumber} or go to the nearest hospital. Do not wait for a reply from this app.` },
  { q: "Who can see my information?", a: "Only the clinicians your hospital has assigned to you. Hospital administrators and platform administrators cannot see clinical data." },
  { q: "What if I lose my authenticator app?", a: "Contact your Hospital Admin. They can reset your authenticator so you can set it up again after verifying who you are." },
  { q: "Does it cost anything?", a: "The demo is free to try. A real hospital deployment would need its own agreement, which does not exist yet." },
  { q: "Which hospitals use it?", a: "None yet. Hospitals marked \"Designed for\" are only examples of the kind of setting we are building for." },
];

export default function FaqSection() {
  return (
    <section id="faq" className="bg-ice py-16 sm:py-20" aria-labelledby="faq-h">
      <div className="mx-auto max-w-3xl px-4">
        <Reveal className="text-center">
          <h2 id="faq-h" className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Frequently asked questions</h2>
        </Reveal>
        <div className="mt-8 space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 40}>
              <details className="group rounded-xl border bg-white px-4 py-3 shadow-sm open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="size-4 shrink-0 text-[#1B7A7E] transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
