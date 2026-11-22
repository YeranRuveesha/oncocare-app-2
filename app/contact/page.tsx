import type { Metadata } from "next";
import PublicShell from "@/components/landing/PublicShell";
import ContactForm from "@/components/landing/ContactForm";

export const metadata: Metadata = { title: "Contact us · OncoCare BMT", description: "Send a message to the OncoCare BMT team." };

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-xl px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold text-ink">Contact us</h1>
        <p className="mb-8 mt-2 text-muted-foreground">Questions about the demo or about using it at a hospital? Write to us.</p>
        <ContactForm />
      </div>
    </PublicShell>
  );
}
