// TODO: clinician review before launch (educational medical content).
import Reveal from "./Reveal";

function Person({ x, label, color }: { x: number; label: string; color: string }) {
  return (
    <g aria-hidden="true">
      <circle cx={x} cy="34" r="14" fill={color} />
      <path d={`M${x - 24} 88 q0 -34 24 -34 q24 0 24 34 z`} fill={color} />
      <text x={x} y="108" textAnchor="middle" fontSize="11" fill="#1E293B" fontFamily="sans-serif">{label}</text>
    </g>
  );
}

function AutologousArt() {
  return (
    <svg viewBox="0 0 240 120" role="img" aria-label="Stem cells are collected from the patient and later given back to the same patient." className="mx-auto w-full max-w-xs oc-anim">
      <Person x={120} label="The patient" color="#0F4C81" />
      <g className="oc-orbit" style={{ "--ox": "120px", "--oy": "62px" } as React.CSSProperties}>
        <circle cx="120" cy="14" r="6" fill="#fff" stroke="#1B7A7E" strokeWidth="2.5" />
        <circle cx="120" cy="14" r="2.2" fill="#1B7A7E" />
      </g>
      <circle cx="120" cy="62" r="48" fill="none" stroke="#1B7A7E" strokeOpacity="0.25" strokeDasharray="4 5" />
    </svg>
  );
}

function AllogeneicArt() {
  return (
    <svg viewBox="0 0 240 120" role="img" aria-label="Stem cells pass from a matched donor to the patient." className="mx-auto w-full max-w-xs oc-anim">
      <Person x={44} label="Matched donor" color="#1B7A7E" />
      <Person x={196} label="The patient" color="#0F4C81" />
      <line x1="76" y1="62" x2="164" y2="62" stroke="#1B7A7E" strokeOpacity="0.3" strokeDasharray="4 5" />
      <g className="oc-donate" style={{ "--dist": "92px" } as React.CSSProperties}>
        <circle cx="72" cy="62" r="6" fill="#fff" stroke="#1B7A7E" strokeWidth="2.5" />
        <circle cx="72" cy="62" r="2.2" fill="#1B7A7E" />
      </g>
    </svg>
  );
}

export default function TransplantTypes() {
  return (
    <section id="what-is-bmt" className="scroll-mt-20 bg-ice py-16 sm:py-20" aria-labelledby="bmt-title">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="bmt-title" className="font-display text-2xl font-extrabold text-ink sm:text-4xl">What is a bone marrow transplant?</h2>
          <p className="mt-4 text-base leading-relaxed text-ink/80">
            Some diseases, and some of the treatments for them, damage the bone marrow. In a bone marrow (stem cell) transplant, healthy blood-forming stem cells are given to the patient to replace the damaged marrow, so the body can make healthy blood cells again.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal className="rounded-2xl border bg-white p-6 shadow-sm">
            <AutologousArt />
            <h3 className="mt-4 font-display text-xl font-bold text-ink">Autologous</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">Uses the patient&apos;s <b>own</b> stem cells. They are collected, stored safely, and given back after treatment.</p>
          </Reveal>
          <Reveal delay={120} className="rounded-2xl border bg-white p-6 shadow-sm">
            <AllogeneicArt />
            <h3 className="mt-4 font-display text-xl font-bold text-ink">Allogeneic</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">Uses stem cells from a <b>matched donor</b>. The donor may be a family member or an unrelated person whose cells match closely.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
