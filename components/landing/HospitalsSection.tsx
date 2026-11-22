import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNER_HOSPITALS, STATUS_BADGE } from "@/config/partner-hospitals";
import Reveal from "./Reveal";

/** Simple original outline of Sri Lanka (stylised, not a survey map) with pins for the listed cities. */
function SriLankaOutline() {
  return (
    <svg viewBox="0 0 200 280" className="mx-auto h-64 w-auto" role="img" aria-label="Outline of Sri Lanka with Colombo marked">
      <path
        d="M96 8c14 6 22 20 38 30 14 9 28 22 30 42 2 20 8 28 12 46 4 20-2 40-12 58-10 18-26 40-46 54-14 10-32 12-44 2-14-12-20-34-24-54-4-22-14-36-12-60 2-26 4-46 16-66 10-16 20-34 42-52z"
        fill="#F0F6FA" stroke="#0F4C81" strokeWidth="2.5" strokeLinejoin="round"
      />
      <g>
        <circle cx="62" cy="168" r="14" fill="#1B7A7E" opacity="0.2" className="oc-anim oc-pulse" />
        <circle cx="62" cy="168" r="5" fill="#1B7A7E" />
        <text x="76" y="172" fontSize="12" fontWeight="700" fill="#1E293B">Colombo</text>
      </g>
    </svg>
  );
}

export default function HospitalsSection() {
  return (
    <section id="hospitals" className="py-16 sm:py-20" aria-labelledby="hospitals-h">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1fr_1.3fr]">
        <Reveal><SriLankaOutline /></Reveal>
        <div>
          <Reveal>
            <h2 id="hospitals-h" className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Built for hospitals in Sri Lanka</h2>
            <p className="mt-3 text-muted-foreground">OncoCare BMT is designed so each hospital can have its own name, colours and separate data. It is a student prototype: no hospital below has agreed to use it yet.</p>
          </Reveal>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {PARTNER_HOSPITALS.map((h, i) => (
              <Reveal as="li" key={h.name} delay={i * 80} className="flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#0F4C81]/10 text-[#0F4C81]"><Building2 className="size-5" aria-hidden="true" /></span>
                <div>
                  <p className="font-display text-sm font-bold text-ink">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.type === "government" ? "Government" : "Private"} · {h.city}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-[#1B7A7E]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1B7A7E]">{STATUS_BADGE[h.status]}</span>
                </div>
              </Reveal>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">&ldquo;Designed for&rdquo; means we studied the setting. It is not a partnership or endorsement.</p>
          <Button asChild className="mt-5" variant="brand"><Link href="/contact">Contact us</Link></Button>
        </div>
      </div>
    </section>
  );
}
