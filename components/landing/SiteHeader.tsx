"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlatformLogo from "@/components/shell/PlatformLogo";
import { NAV_ANCHORS } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Top bar: logo left, section links in the middle (a hamburger menu on phones),
 * Sign up + Login on the right. Sticky; gets a soft shadow and blur after scrolling.
 * On the home page the link of the section you are reading is highlighted.
 */
export default function SiteHeader({ home = false }: { home?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!home) return;
    const els = NAV_ANCHORS.map((a) => document.getElementById(a.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [home]);

  const href = (id: string) => (home ? `#${id}` : `/#${id}`);

  return (
    <header className={cn("sticky top-0 z-30 border-b transition-shadow", scrolled ? "bg-white/85 shadow-md backdrop-blur" : "bg-white/95 backdrop-blur")}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3" aria-label="Main">
        <PlatformLogo />
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_ANCHORS.map((a) => (
            <li key={a.id}>
              <a
                href={href(a.id)}
                aria-current={active === a.id ? "true" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active === a.id ? "bg-brand/10 text-[#14595c]" : "text-ink/75 hover:bg-muted hover:text-ink",
                )}
              >
                {a.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button asChild variant="outline" className="h-9 px-2.5 text-[13px] sm:h-10 sm:px-4 sm:text-sm">
            <Link href="/signup">Sign up</Link>
          </Button>
          <Button asChild className="h-9 px-2.5 text-[13px] sm:h-10 sm:px-4 sm:text-sm">
            <Link href="/login">Login</Link>
          </Button>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-md hover:bg-muted lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t bg-white px-4 pb-4 lg:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col py-2">
            {NAV_ANCHORS.map((a) => (
              <li key={a.id}>
                <a href={href(a.id)} onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-muted">
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
