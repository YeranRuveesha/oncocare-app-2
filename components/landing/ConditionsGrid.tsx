// TODO: clinician review before launch (educational medical content).
import { Droplets, Dna, Network, Sprout } from "lucide-react";
import Reveal from "./Reveal";

const CONDITIONS = [
  { icon: Droplets, name: "Acute myeloid leukaemia (AML)", text: "A cancer of the blood and bone marrow where the marrow makes too many immature white blood cells." },
  { icon: Dna, name: "Acute lymphoblastic leukaemia (ALL)", text: "A fast-growing blood cancer that starts in the cells that become lymphocytes, a type of white blood cell." },
  { icon: Network, name: "Lymphomas", text: "Cancers of the lymphatic system, which is part of the body's defence against infection." },
  { icon: Sprout, name: "Thalassaemia", text: "An inherited blood condition in which the body makes less healthy haemoglobin than it needs." },
];

export default function ConditionsGrid() {
  return (
    <section id="conditions" className="bg-ice py-16 sm:py-20" aria-labelledby="conditions-h">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="conditions-h" className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Conditions where a transplant may be considered</h2>
          <p className="mt-3 text-muted-foreground">Some examples only. Whether a transplant is right for a person is always decided by their own medical team.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONDITIONS.map((c, i) => (
            <Reveal key={c.name} delay={i * 90} className="group rounded-xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <span className="grid size-11 place-items-center rounded-lg bg-[#1B7A7E]/10 text-[#1B7A7E] transition group-hover:scale-110">
                <c.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-ink">{c.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
