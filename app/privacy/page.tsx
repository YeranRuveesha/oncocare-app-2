import type { Metadata } from "next";
import PublicShell from "@/components/landing/PublicShell";

export const metadata: Metadata = { title: "Privacy · OncoCare BMT" };

// Placeholder text for a student demo. Replace with reviewed legal text before any real launch.
export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold text-ink">Privacy</h1>
        <p className="mt-2 text-xs text-muted-foreground">Placeholder page. Not legal advice.</p>
        <div className="mt-8 space-y-6">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Demo only</h2>
          <p className="mt-1 text-sm text-muted-foreground">OncoCare BMT is a student prototype. Please use made-up names and made-up health data only.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">What the site stores</h2>
          <p className="mt-1 text-sm text-muted-foreground">Account details you type in (name, email, phone), and the demo records you create. These are kept in the project's database and are visible only to the roles allowed to see them.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Who can see what</h2>
          <p className="mt-1 text-sm text-muted-foreground">Patients see their own records. Assigned clinicians see their patients' clinical records. Hospital and platform administrators manage accounts but cannot see clinical records.</p>
        </section>
        <section>
          <h2 id="pdpa" className="font-display text-lg font-bold text-ink">Data protection (Sri Lanka PDPA)</h2>
          <p className="mt-1 text-sm text-muted-foreground">Placeholder. A real service would explain here how it follows the Personal Data Protection Act of Sri Lanka: what is collected, why, how long it is kept, and how to ask for access or deletion. This demo should only ever hold made-up data.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Your choices</h2>
          <p className="mt-1 text-sm text-muted-foreground">You can ask us to delete your demo account using the contact page.</p>
        </section>
        </div>
      </div>
    </PublicShell>
  );
}
