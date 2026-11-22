"use client";

// TODO: clinician review before launch. General wording only: timings differ for every patient.
import { useEffect, useState } from "react";
import { Home, Pill, Stethoscope, Syringe, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView, usePrefersReducedMotion } from "./Reveal";

const STEPS = [
  { icon: Stethoscope, title: "Diagnosis and planning", text: "The care team confirms the diagnosis, checks if a transplant is right, and plans the treatment." },
  { icon: Pill, title: "Conditioning treatment", text: "Treatment to prepare the body for the new stem cells." },
  { icon: Syringe, title: "Stem cell infusion (Day 0)", text: "The stem cells are given through a drip, like a blood transfusion. This day is called Day 0." },
  { icon: Sprout, title: "Engraftment", text: "The new cells settle into the marrow and start to grow and make new blood cells." },
  { icon: Home, title: "Recovery at home", text: "Outpatient monitoring after discharge, for example around Day +14, Day +100 and beyond. The team checks in often." },
];

export default function JourneyTimeline() {
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  // The highlighted step moves along by itself (stops for reduced motion, and when the visitor picks a step).
  useEffect(() => {
    if (!seen || reduced || !auto) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, [seen, reduced, auto]);

  return (
    <section id="journey" className="scroll-mt-20 bg-white py-16 sm:py-20" aria-labelledby="journey-title">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="journey-title" className="font-display text-2xl font-extrabold text-ink sm:text-4xl">The transplant journey</h2>
          <p className="mt-4 text-base text-ink/80">A general picture. Every patient&apos;s journey is different, and your care team will tell you what to expect.</p>
        </div>
        <div ref={ref} className={cn("relative mt-12", seen && "is-in")}>
          {/* the line that draws itself: horizontal on large screens, vertical on phones */}
          <div className="absolute left-5 top-0 hidden h-full w-0.5 bg-border max-lg:block" aria-hidden="true">
            <div className="oc-draw-y h-full w-full bg-brand" />
          </div>
          <div className="absolute left-[10%] right-[10%] top-6 hidden h-0.5 bg-border lg:block" aria-hidden="true">
            <div className="oc-draw-x h-full w-full bg-brand" />
          </div>
          <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-4">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li
                  key={s.title}
                  className="oc-reveal flex gap-4 lg:flex-col lg:items-center lg:text-center"
                  style={{ transitionDelay: `${seen ? 250 + i * 350 : 0}ms`, ...(seen ? { opacity: 1, transform: "none" } : {}) }}
                >
                  <button
                    type="button"
                    onClick={() => { setActive(i); setAuto(false); }}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    aria-current={on ? "step" : undefined}
                    className={cn(
                      "relative z-10 grid size-11 shrink-0 place-items-center rounded-full border-2 bg-white transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      on ? "oc-anim oc-pulse border-brand bg-brand text-white" : "border-border text-[#14595c]",
                    )}
                  >
                    <s.icon className="size-5" aria-hidden="true" />
                  </button>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#14595c]">Step {i + 1}</p>
                    <h3 className="font-display text-base font-bold text-ink">{s.title}</h3>
                    <p className={cn("mt-1 text-sm leading-relaxed text-ink/75 transition-opacity", on ? "opacity-100" : "opacity-80")}>{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
