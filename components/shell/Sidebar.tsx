"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Building2, ClipboardCheck, FileText, LineChart, ClipboardList, Dumbbell, FileClock, HeartPulse, LayoutDashboard, ListChecks, LogOut,
  Menu, Palette, ShieldCheck, Stethoscope, User, UserCog, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard, log: ClipboardList, rehab: Dumbbell, report: Activity, profile: User, patients: Users,
  triage: ListChecks, clinicians: Stethoscope, approvals: ClipboardCheck, branding: Palette, audit: FileClock,
  hospitals: Building2, progress: LineChart, discharge: FileText, hadmins: UserCog, admins: ShieldCheck, heart: HeartPulse,
};
export type NavIcon = keyof typeof ICONS;
export interface NavItem { href: string; label: string; icon: NavIcon; exact?: boolean; badge?: number }

/** Left navigation panel. On phones it becomes a slide-out drawer. */
export default function Sidebar({ items, header, avatar }: { items: NavItem[]; header: React.ReactNode; avatar: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  const nav = (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const active = isActive(i);
        return (
          <Link
            key={i.href}
            href={i.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-ink/80 hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{i.label}</span>
            {i.badge ? <span className="rounded-full bg-crimson px-2 text-xs font-bold text-white">{i.badge}</span> : null}
          </Link>
        );
      })}
      <form action="/api/auth/logout" method="post" className="mt-2 border-t pt-2">
        <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/80 hover:bg-muted">
          <LogOut className="size-4.5" aria-hidden="true" /> Logout
        </button>
      </form>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r bg-white lg:flex">
        <div className="border-b p-5">{header}</div>
        {nav}
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-white px-4 py-2.5 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-md text-ink hover:bg-muted">
          <Menu className="size-5" />
        </button>
        {avatar}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-white shadow-xl">
            <div className="flex items-start justify-between gap-2 border-b p-4">
              <div className="min-w-0 flex-1">{header}</div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-md hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}

/** Top-right avatar with a small menu: My Profile, Logout. */
export function AvatarMenu({ name, roleLabel, children }: { name: string; roleLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-border">
        {children}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border bg-white p-1.5 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
            <User className="size-4" /> My Profile
          </Link>
          <form action="/api/auth/logout" method="post">
            <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
              <LogOut className="size-4" /> Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
