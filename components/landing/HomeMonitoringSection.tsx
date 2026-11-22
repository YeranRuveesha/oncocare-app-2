"use client";

// TODO: clinician review before launch (educational medical content).
import { useEffect, useState } from "react";
import { Bug, Droplet, ShieldAlert } from "lucide-react";
import Reveal, { useInView, usePrefersReducedMotion } from "./Reveal";

const CARDS = [
  { icon: Bug, title: "Infections", text: "Your immune system is weak for a while. A fever or feeling suddenly unwell needs to reach your team quickly." },
  { icon: Droplet, title: "Bleeding", text: "Platelets can be low. Nosebleeds, bruises you cannot explain or blood in a stool or urine are worth reporting." },
  { icon: ShieldAlert, title: "GVHD", text: "Graft-versus-host disease can happen after a donor transplant. Rashes, mouth sores or loose stools should be reported." },
];

/** Counts 0 → 14 once when scrolled into view (instantly 14 if the visitor prefers less motion). */
function DayCounter() {
  const [ref, seen] = useInView<HTMLDivElement>(0.4);
  const reduced = usePrefersReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) return setN(14);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= 14) clearInterval(t);
    }, 110);
    return () => clearInterval(t);
  }, [seen, reduced]);
  return (
    <div ref={ref} className="mx-auto flex w-fit flex-col items-center rounded-2xl bg-white px-8 py-6 shadow-md" aria-label="Example: day plus 14 after transplant">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#1B7A7E]">Example day</span>
      <span className="mt-1 font-display text-5xl font-extrabold text-[#0F4C81]" aria-live="off">Day +{n}</span>
      <span className="mt-1 text-xs text-muted-foreground">Counted from transplant day (Day 0)</span>
    </div>
  );
}

export default function HomeMonitoringSection() {
  return (
    <section id="home-monitoring" className="py-16 sm:py-20" aria-labelledby="home-h">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="home-h" className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Why recovery at home needs close monitoring</h2>
          <p className="mt-3 text-muted-foreground">After the hospital stay, the first weeks at home are when small changes matter most. Early reporting helps the team step in sooner.</p>
        </Reveal>
        <Reveal className="mt-8"><DayCounter /></Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 90} className="rounded-xl border bg-white p-5 shadow-sm">
              <span className="grid size-10 place-items-center rounded-lg bg-[#0F4C81]/10 text-[#0F4C81]">
                <c.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-ink">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          This is general information, not medical advice. Always follow your own transplant team&apos;s instructions.
        </p>
      </div>
    </section>
  );
}
