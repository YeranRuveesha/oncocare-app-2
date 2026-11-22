import type { Metadata } from "next";
import PublicShell from "@/components/landing/PublicShell";

export const metadata: Metadata = { title: "Accessibility · OncoCare BMT" };

// Placeholder text for a student demo. Replace with reviewed legal text before any real launch.
export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold text-ink">Accessibility</h1>
        <p className="mt-2 text-xs text-muted-foreground">Placeholder page. Not legal advice.</p>
        <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Our aim</h2>
          <p className="mt-1 text-sm text-muted-foreground">We aim for pages that work with a keyboard and screen reader, have readable colour contrast, and work on small phone screens.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Motion</h2>
          <p className="mt-1 text-sm text-muted-foreground">Animations stop automatically if your device asks for reduced motion, and there is a Pause animations button on the home page.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Tell us</h2>
          <p className="mt-1 text-sm text-muted-foreground">If something is hard to use, please tell us through the contact page.</p>
        </section>
        </div>
      </div>
    </PublicShell>
  );
}
