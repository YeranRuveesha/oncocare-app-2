import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function isHexColor(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

/** Black or white text, whichever is easier to read on the given colour. */
export function readableOn(hex: string): string {
  if (!isHexColor(hex)) return "#ffffff";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.4 ? "#0f172a" : "#ffffff";
}

/** CSS variables that apply a hospital's white-label colours. */
export function brandingStyle(primary: string, accent: string): Record<string, string> {
  const p = isHexColor(primary) ? primary : "#0F4C81";
  const a = isHexColor(accent) ? accent : "#1B7A7E";
  return {
    "--primary": p,
    "--primary-foreground": readableOn(p),
    "--secondary-foreground": p,
    "--accent-foreground": p,
    "--brand-accent": a,
    "--brand-accent-foreground": readableOn(a),
    "--ring": a,
  };
}
