import Link from "next/link";
import { cn } from "@/lib/utils";

const OPTS = [["7", "Last 7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "Since transplant"]] as const;

/** Date-range buttons (server links, so the range stays in the URL). Extra keeps other URL parameters. */
export default function RangeButtons({ basePath, active, from, to, custom = false, extra = {} }: { basePath: string; active: string; from: string; to: string; custom?: boolean; extra?: Record<string, string> }) {
  const href = (r: string) => `${basePath}?${new URLSearchParams({ ...extra, range: r })}`;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {OPTS.map(([k, l]) => <Link key={k} href={href(k)} aria-current={active === k ? "true" : undefined} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", active === k ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>{l}</Link>)}
      {custom && (
        <form action={basePath} className="flex flex-wrap items-center gap-1.5 text-xs">
          {Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input type="hidden" name="range" value="custom" />
          <label className="sr-only" htmlFor="rf">From</label><input id="rf" type="date" name="from" defaultValue={from} className="h-8 rounded border px-2" />
          <label className="sr-only" htmlFor="rt">To</label><input id="rt" type="date" name="to" defaultValue={to} className="h-8 rounded border px-2" />
          <button className="h-8 rounded border px-3 font-semibold hover:bg-muted" type="submit">Custom range</button>
        </form>
      )}
      <span className="text-xs text-muted-foreground">{from} to {to}</span>
    </div>
  );
}
