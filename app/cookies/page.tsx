import type { Metadata } from "next";
import PublicShell from "@/components/landing/PublicShell";

export const metadata: Metadata = { title: "Cookies · OncoCare BMT" };

// Placeholder text for a student demo. Replace with reviewed legal text before any real launch.
export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold text-ink">Cookies</h1>
        <p className="mt-2 text-xs text-muted-foreground">Placeholder page. Not legal advice.</p>
        <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Only what is needed</h2>
          <p className="mt-1 text-sm text-muted-foreground">We use cookies that keep you logged in and keep the session secure. We do not use advertising or tracking cookies.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Your device</h2>
          <p className="mt-1 text-sm text-muted-foreground">A small setting on your device remembers that you closed the cookie notice and whether you paused animations.</p>
        </section>
        </div>
      </div>
    </PublicShell>
  );
}
