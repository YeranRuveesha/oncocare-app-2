import Link from "next/link";
import { Button } from "@/components/ui/button";
import Reveal from "./Reveal";

export default function CtaBanner() {
  return (
    <section className="py-16 sm:py-20" aria-label="Get started">
      <Reveal className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#0F4C81] to-[#1B7A7E] px-6 py-12 text-center text-white shadow-lg">
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Try the demo with made-up data</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/85">See how daily check-ins, symptom reports and triage fit together. No real patient details, ever.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-white text-[#0F4C81] hover:bg-white/90"><Link href="/signup">Create an account</Link></Button>
          <Button asChild size="lg" variant="outline" className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/contact">Contact us</Link></Button>
        </div>
      </Reveal>
    </section>
  );
}
