// Dates are stored as UTC timestamps (or plain dates) and always SHOWN in Sri Lanka time.
export const TZ = "Asia/Colombo";

/** Today's calendar date in Colombo as YYYY-MM-DD. */
export function colomboDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to + "T00:00:00Z").getTime() - new Date(from + "T00:00:00Z").getTime()) / 86400000);
}

/** Day +N after transplant for a given calendar date (null if no transplant date). */
export function dayPlus(transplantDate: string | null | undefined, date: string): number | null {
  if (!transplantDate) return null;
  return Math.max(0, daysBetween(transplantDate, date));
}

export const fmtDate = (v: string | Date) =>
  new Date(typeof v === "string" && v.length === 10 ? v + "T00:00:00Z" : v).toLocaleDateString("en-GB", { timeZone: v instanceof Date || (typeof v === "string" && v.length > 10) ? TZ : "UTC", day: "2-digit", month: "short", year: "numeric" });
export const fmtDateTime = (v: string | Date) =>
  new Date(v).toLocaleString("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const shortDate = (v: string) =>
  new Date(v.length === 10 ? v + "T00:00:00Z" : v).toLocaleDateString("en-GB", { timeZone: v.length === 10 ? "UTC" : TZ, day: "2-digit", month: "short" });
