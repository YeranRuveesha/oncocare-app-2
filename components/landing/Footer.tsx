"use client";

import Link from "next/link";
import { ArrowUp, Globe } from "lucide-react";
import PlatformLogo from "@/components/shell/PlatformLogo";
import { SITE } from "@/config/site";

const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  { title: "Platform", links: [{ href: "/", label: "Home" }, { href: "/#about-bmt", label: "About BMT" }, { href: "/#journey", label: "How it works" }, { href: "/#features", label: "Features" }, { href: "/#faq", label: "FAQ" }] },
  { title: "Access", links: [{ href: "/signup", label: "Sign up" }, { href: "/login", label: "Login" }, { href: "/activate", label: "Activate my account (Hospital Admin / Admin)" }] },
  { title: "For hospitals", links: [{ href: "/#hospitals", label: "Hospitals we design for" }, { href: "/contact", label: "Request a demo" }, { href: "/contact", label: "Contact us" }] },
  { title: "Learn", links: [{ href: "/#about-bmt", label: "What is bone marrow?" }, { href: "/#journey", label: "Transplant journey" }, { href: "/#conditions", label: "Conditions treated" }, { href: "/#home-monitoring", label: "Recovery at home" }] },
  { title: "Legal", links: [{ href: "/privacy", label: "Privacy Policy" }, { href: "/terms", label: "Terms of Use" }, { href: "/cookies", label: "Cookie Policy" }, { href: "/accessibility", label: "Accessibility" }, { href: "/privacy#pdpa", label: "Data Protection (Sri Lanka PDPA)" }] },
];

function Group({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  // <details> gives a tap-to-open accordion on phones; always open on wide screens.
  return (
    <details className="group border-b border-white/10 py-3 md:border-0 md:py-0 md:[&>summary]:pointer-events-none" open>
      <summary className="cursor-pointer list-none font-display text-sm font-bold text-white [&::-webkit-details-marker]:hidden">{title}</summary>
      <ul className="mt-3 space-y-2 text-sm text-white/75">
        {links.map((l) => (
          <li key={l.href + l.label}><Link href={l.href} className="hover:text-white hover:underline">{l.label}</Link></li>
        ))}
      </ul>
    </details>
  );
}

export default function Footer() {
  return (
    <footer className="bg-ink text-white" aria-label="Site footer">
      <div className="bg-crimson px-4 py-2 text-center text-xs font-semibold">
        In a medical emergency, contact your hospital or call the national ambulance service {SITE.ambulanceNumber} immediately. OncoCare BMT is not an emergency service.
      </div>
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-2 px-4 py-10 md:gap-y-8 md:grid-cols-3 lg:grid-cols-[1.5fr_repeat(5,1fr)]">
        <div>
          <div className="rounded-lg bg-white px-3 py-2 w-fit"><PlatformLogo /></div>
          <p className="mt-3 max-w-xs text-sm text-white/75">{SITE.tagline}.</p>
          <address className="mt-3 text-sm not-italic text-white/75">
            <a href={`mailto:${SITE.contact.email}`} className="hover:underline">{SITE.contact.email}</a><br />
            {SITE.contact.phone}<br />
            {SITE.contact.address}
          </address>
          <ul className="mt-3 flex flex-wrap gap-3 text-xs">
            {SITE.social.map((s) => (
              <li key={s.name}><a href={s.href} target="_blank" rel="noopener noreferrer" className="text-white/75 hover:text-white hover:underline">{s.name}</a></li>
            ))}
          </ul>
        </div>
        {COLS.map((c) => <Group key={c.title} title={c.title} links={c.links} />)}
      </div>
      <div className="border-t border-white/10 px-4 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>OncoCare BMT supports, and does not replace, professional medical care. AI triage is a decision-support tool and not a diagnosis.</p>
            <p>This is a prototype built with simulated data.</p>
            <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5">
              <Globe className="size-4" aria-hidden="true" />
              <span className="sr-only">Language (coming soon)</span>
              <select disabled title="Other languages coming soon" className="rounded bg-white/10 px-2 py-1 text-white/80">
                {SITE.languages.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10">
              <ArrowUp className="size-4" aria-hidden="true" /> Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
