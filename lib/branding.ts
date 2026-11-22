// Colour contrast helpers (shared by the live preview and the server).
import { readableOn } from "@/lib/utils";

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Warning text if white/black text on this colour would be hard to read (below WCAG AA 4.5:1). */
export function contrastWarning(hex: string): string | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const text = readableOn(hex);
  const ratio = contrastRatio(hex, text);
  return ratio < 4.5 ? `Text on ${hex} is hard to read (contrast ${ratio.toFixed(1)}:1, needs 4.5:1). Pick a darker or lighter colour.` : null;
}
