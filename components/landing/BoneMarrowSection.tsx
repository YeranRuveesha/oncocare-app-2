"use client";

// TODO: clinician review before launch (educational medical content).
import { useState } from "react";
import Reveal from "./Reveal";
import { cn } from "@/lib/utils";

type Kind = "red" | "white" | "platelet";

const KINDS: { id: Kind; label: string; line: string; color: string }[] = [
  { id: "red", label: "Red blood cells", line: "Carry oxygen around the body.", color: "#DC2626" },
  { id: "white", label: "White blood cells", line: "Fight infection.", color: "#0F4C81" },
  { id: "platelet", label: "Platelets", line: "Help the blood clot so bleeding stops.", color: "#B45309" },
];

/** Original illustration: bone cross-section, spongy marrow, stem cells that split into 3 blood cell types. */
function Illustration({ active }: { active: Kind | null }) {
  const dim = (k: Kind) => (active && active !== k ? 0.18 : 1);
  // Each group is positioned inside the marrow; CSS custom properties set how it drifts/emerges.
  const stem = [
    { x: 170, y: 150, dx: 10, dy: -6, d: "0s" },
    { x: 235, y: 185, dx: -8, dy: 8, d: "-3s" },
    { x: 205, y: 118, dx: 6, dy: 10, d: "-6s" },
  ];
  return (
    <svg viewBox="0 0 400 320" role="img" aria-label="Cross-section of a bone. Inside the soft spongy marrow, stem cells divide into red blood cells, white blood cells and platelets." className="w-full max-w-md">
      <defs>
        <radialGradient id="marrow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#FBD5D5" />
          <stop offset="100%" stopColor="#F3A9A9" />
        </radialGradient>
      </defs>
      {/* hard outer bone */}
      <ellipse cx="200" cy="160" rx="175" ry="125" fill="#EADFC9" stroke="#C7B58E" strokeWidth="3" />
      <ellipse cx="200" cy="160" rx="150" ry="100" fill="#F5EEDD" stroke="#D7C8A4" strokeWidth="2" />
      {/* spongy bone struts */}
      <g stroke="#E4D3AE" strokeWidth="5" strokeLinecap="round" fill="none" aria-hidden="true">
        <path d="M70 140 q22 -16 40 6" /><path d="M300 200 q24 12 44 -8" /><path d="M96 214 q18 14 38 4" /><path d="M280 106 q20 -14 42 2" />
      </g>
      {/* soft marrow */}
      <ellipse cx="200" cy="160" rx="122" ry="78" fill="url(#marrow)" />
      <g className="oc-anim">
        {/* stem cells (drift slowly) */}
        {stem.map((s, i) => (
          <g key={i} className="oc-drift" style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--t": "10s", "--d": s.d } as React.CSSProperties}>
            <circle cx={s.x} cy={s.y} r="11" fill="#fff" stroke="#0F4C81" strokeWidth="2" />
            <circle cx={s.x} cy={s.y} r="4.5" fill="#1B7A7E" />
          </g>
        ))}
        {/* daughter cells appear and drift outwards */}
        {/* red blood cells */}
        {[
          { x: 150, y: 175, ex: -34, ey: 10, d: "0s" }, { x: 232, y: 140, ex: 40, ey: -12, d: "-4s" }, { x: 190, y: 190, ex: -6, ey: 34, d: "-7s" },
        ].map((c, i) => (
          <g key={"r" + i} className="oc-emerge" style={{ "--ex": `${c.ex}px`, "--ey": `${c.ey}px`, "--d": c.d, opacity: dim("red"), transition: "opacity .3s" } as React.CSSProperties}>
            <ellipse cx={c.x} cy={c.y} rx="12" ry="12" fill="#DC2626" />
            <ellipse cx={c.x} cy={c.y} rx="5" ry="5" fill="#EF6A6A" />
          </g>
        ))}
        {/* white blood cells */}
        {[
          { x: 215, y: 165, ex: 44, ey: 22, d: "-2s" }, { x: 175, y: 128, ex: -36, ey: -22, d: "-6s" },
        ].map((c, i) => (
          <g key={"w" + i} className="oc-emerge" style={{ "--ex": `${c.ex}px`, "--ey": `${c.ey}px`, "--d": c.d, opacity: dim("white"), transition: "opacity .3s" } as React.CSSProperties}>
            <circle cx={c.x} cy={c.y} r="13" fill="#F0F6FA" stroke="#0F4C81" strokeWidth="2" />
            <path d={`M${c.x - 6} ${c.y - 3} q4 -6 8 0 q4 6 4 0 q-2 8 -8 6 z`} fill="#0F4C81" />
          </g>
        ))}
        {/* platelets */}
        {[
          { x: 200, y: 150, ex: 8, ey: -44, d: "-1s" }, { x: 160, y: 160, ex: -46, ey: 6, d: "-5s" }, { x: 240, y: 175, ex: 36, ey: 28, d: "-8s" },
        ].map((c, i) => (
          <g key={"p" + i} className="oc-emerge" style={{ "--ex": `${c.ex}px`, "--ey": `${c.ey}px`, "--d": c.d, opacity: dim("platelet"), transition: "opacity .3s" } as React.CSSProperties}>
            <ellipse cx={c.x} cy={c.y} rx="6" ry="3.5" fill="#E9B949" transform={`rotate(25 ${c.x} ${c.y})`} />
            <circle cx={c.x + 7} cy={c.y - 3} r="2.2" fill="#E9B949" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function BoneMarrowSection() {
  const [active, setActive] = useState<Kind | null>(null);
  const current = KINDS.find((k) => k.id === active);
  return (
    <section id="about-bmt" className="scroll-mt-20 bg-white py-16 sm:py-20" aria-labelledby="about-bmt-title">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#14595c]">The basics</p>
          <h2 id="about-bmt-title" className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-4xl">What is bone marrow?</h2>
          <p className="mt-4 text-base leading-relaxed text-ink/80">
            Bone marrow is the soft, spongy tissue inside some of your bones. It is where your body makes its blood cells.
          </p>
          <p className="mt-3 text-base leading-relaxed text-ink/80">
            It starts with <b>stem cells</b>, young cells that can become any type of blood cell. Every day, stem cells divide and grow into three kinds of blood cells:
          </p>
          <div className="mt-5 flex flex-col gap-2" role="group" aria-label="Types of blood cells">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={active === k.id}
                onMouseEnter={() => setActive(k.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(k.id)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((a) => (a === k.id ? null : k.id))}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active === k.id && "border-brand shadow-md",
                )}
              >
                <span className="size-4 shrink-0 rounded-full" style={{ background: k.color }} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold text-ink">{k.label}</span>
                  <span className="block text-sm text-ink/75">{k.line}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 min-h-6 text-sm font-medium text-[#14595c]" aria-live="polite">
            {current ? `${current.label}: ${current.line}` : "Tap or hover a cell type to highlight it."}
          </p>
        </Reveal>
        <Reveal delay={150} className="flex justify-center rounded-3xl bg-ice p-6">
          <Illustration active={active} />
        </Reveal>
      </div>
    </section>
  );
}
