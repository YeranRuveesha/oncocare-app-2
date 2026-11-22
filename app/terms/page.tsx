import type { Metadata } from "next";
import PublicShell from "@/components/landing/PublicShell";

export const metadata: Metadata = { title: "Terms of use · OncoCare BMT" };

// Placeholder text for a student demo. Replace with reviewed legal text before any real launch.
export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold text-ink">Terms of use</h1>
        <p className="mt-2 text-xs text-muted-foreground">Placeholder page. Not legal advice.</p>
        <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Not medical advice</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nothing on this site is medical advice, diagnosis or treatment. Always follow your own transplant team.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Emergencies</h2>
          <p className="mt-1 text-sm text-muted-foreground">In an emergency call the ambulance number or go to the nearest hospital. Do not use this app.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Fair use</h2>
          <p className="mt-1 text-sm text-muted-foreground">Do not enter real patient data. Do not try to break the site or access other people's accounts.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">No guarantee</h2>
          <p className="mt-1 text-sm text-muted-foreground">This is a prototype provided as is, with no promise it is available or error-free.</p>
        </section>
        </div>
      </div>
    </PublicShell>
  );
}
