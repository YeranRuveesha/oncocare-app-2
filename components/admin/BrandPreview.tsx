"use client";

import { AlertTriangle, HeartPulse, LayoutDashboard, Users } from "lucide-react";
import { contrastWarning } from "@/lib/branding";
import { readableOn } from "@/lib/utils";

/** Live preview of the left navigation panel with the chosen logo, name and colours. */
export default function BrandPreview({ name, logo, primary, secondary }: { name: string; logo: string | null; primary: string; secondary: string }) {
  const warn = [contrastWarning(primary), contrastWarning(secondary)].filter(Boolean);
  return (
    <div className="flex flex-col gap-3">
      <div className="w-64 overflow-hidden rounded-xl border bg-white shadow-sm" aria-label="Navigation preview">
        <div className="flex items-center gap-3 border-b p-4">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="size-11 rounded-lg border object-contain p-1" />
          ) : (
            <span className="grid size-11 place-items-center rounded-lg" style={{ background: primary, color: readableOn(primary) }}>
              <HeartPulse className="size-5" />
            </span>
          )}
          <p className="font-display text-sm font-bold leading-tight">{name || "Hospital name"}</p>
        </div>
        <div className="flex flex-col gap-1 p-3 text-sm">
          <span className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium" style={{ background: primary, color: readableOn(primary) }}>
            <LayoutDashboard className="size-4" /> Dashboard
          </span>
          <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-ink/80"><Users className="size-4" /> Patients</span>
          <span className="mt-2 rounded-lg px-3 py-2 text-center text-xs font-semibold" style={{ background: secondary, color: readableOn(secondary) }}>
            Secondary colour button
          </span>
        </div>
      </div>
      {warn.map((w) => (
        <p key={w} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {w}
        </p>
      ))}
    </div>
  );
}
