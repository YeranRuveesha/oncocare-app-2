import Link from "next/link";
import { Button } from "@/components/ui/button";
import MotionToggle from "./MotionToggle";

/** Original hero illustration: a gently floating drop and cells. */
function HeroArt() {
  return (
    <svg viewBox="0 0 320 300" className="oc-anim oc-float mx-auto w-full max-w-sm" role="img" aria-label="Illustration of blood cells and a heart">
      <circle cx="160" cy="150" r="130" fill="#1B7A7E" opacity="0.08" />
      <path d="M160 60c30 40 60 70 60 105a60 60 0 0 1-120 0c0-35 30-65 60-105z" fill="#DC2626" opacity="0.9" />
      <path d="M130 150c0-14 14-24 30-8 16-16 30-6 30 8 0 16-30 36-30 36s-30-20-30-36z" fill="#fff" />
      {[[70, 90, 18, "#0F4C81"], [250, 110, 14, "#1B7A7E"], [255, 220, 20, "#DC2626"], [60, 215, 12, "#B45309"]].map(([x, y, r, c], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} opacity="0.75" className="oc-anim oc-drift" style={{ "--d": `-${i * 2}s`, "--t": `${7 + i}s` } as React.CSSProperties} />
      ))}
    </svg>
  );
}

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-ice to-white">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:py-20 lg:grid-cols-[1.3fr_1fr]">
        <div className="text-center lg:text-left">
          <p className="oc-anim oc-fade-up text-sm font-semibold uppercase tracking-wider text-[#1B7A7E]">For bone marrow transplant recovery</p>
          <h1 className="oc-anim oc-fade-up mt-3 font-display text-3xl font-extrabold leading-tight text-ink sm:text-5xl" style={{ "--d": "120ms" } as React.CSSProperties}>
            OncoCare BMT helps transplant patients report how they feel each day, so their hospital team can act early.
          </h1>
          <div className="oc-anim oc-fade-up mt-8 flex flex-wrap justify-center gap-3 lg:justify-start" style={{ "--d": "260ms" } as React.CSSProperties}>
            <Button asChild size="lg" variant="brand"><Link href="/signup">Create an account</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/login">Login</Link></Button>
          </div>
          <div className="mt-5 flex justify-center lg:justify-start"><MotionToggle /></div>
        </div>
        <HeroArt />
      </div>
    </section>
  );
}
