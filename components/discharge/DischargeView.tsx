"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Download, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DischargeDoc } from "@/lib/discharge";
import { cn } from "@/lib/utils";

function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-amber-200 px-0.5">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

/** Searchable accordion of the discharge instructions + print/PDF + "I have read this". */
export default function DischargeView({ doc, acknowledgedAt, canAcknowledge }: { doc: DischargeDoc; acknowledgedAt: string | null; canAcknowledge: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [ack, setAck] = useState<string | null>(acknowledgedAt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const needle = q.trim();

  const sections = useMemo(() => {
    if (!needle) return doc.sections;
    const n = needle.toLowerCase();
    return doc.sections
      .map((s) => ({ ...s, items: s.items.filter((t) => t.toLowerCase().includes(n) || s.title.toLowerCase().includes(n)) }))
      .filter((s) => s.items.length > 0);
  }, [doc.sections, needle]);

  const isOpen = (id: string) => printing || Boolean(needle) || open.has(id);
  const toggle = (id: string) => setOpen((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  function print() {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 100);
  }
  async function confirm() {
    setBusy(true); setErr("");
    const res = await fetch("/api/discharge/acknowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction_id: doc.id }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setAck(new Date().toISOString()); else setErr(j.error ?? "Something went wrong.");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search these instructions (e.g. fever, mouth, sun)" aria-label="Search instructions" className="pl-9" />
        </div>
        {doc.pdf_path && <Button asChild variant="outline"><a href={`/api/discharge/pdf?id=${doc.id}`}><Download /> Download PDF</a></Button>}
        <Button variant="outline" onClick={print}><Printer /> {doc.pdf_path ? "Print" : "Print / save as PDF"}</Button>
      </div>

      <div className="print-area space-y-3">
        <p className="hidden text-lg font-bold print:block">{doc.title} (version {doc.version})</p>
        {sections.length === 0 && <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">Nothing matches &ldquo;{needle}&rdquo;.</p>}
        {sections.map((s) => {
          const warn = s.type === "warning";
          return (
            <section key={s.id} className={cn("rounded-xl border bg-white shadow-sm", warn && "border-crimson/40")}>
              <h2>
                <button
                  type="button" onClick={() => toggle(s.id)} aria-expanded={isOpen(s.id)} aria-controls={`sec-${s.id}`}
                  className={cn("flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-display text-base font-bold", warn ? "text-crimson" : "text-ink")}
                >
                  <span className="flex items-center gap-2">{warn && <AlertTriangle className="size-5" aria-hidden="true" />}<Mark text={s.title} q={needle} /></span>
                  <span className="text-xs font-normal text-muted-foreground print:hidden">{isOpen(s.id) ? "Hide" : "Show"}</span>
                </button>
              </h2>
              <div id={`sec-${s.id}`} hidden={!isOpen(s.id)} className="border-t px-4 py-3">
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {s.items.map((t, i) => <li key={i}><Mark text={t} q={needle} /></li>)}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      {canAcknowledge && (
        <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm print:hidden">
          {ack ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="size-5" aria-hidden="true" /> You confirmed version {doc.version} on {new Date(ack).toLocaleDateString("en-GB", { dateStyle: "medium" })}.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">When you have read everything, please confirm. Your care team can see that you did.</p>
              <Button variant="brand" onClick={confirm} disabled={busy}>{busy ? "Saving…" : "I have read these instructions"}</Button>
            </div>
          )}
          {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground print:hidden">General information only. Your own transplant team&apos;s advice always comes first. In an emergency call the ambulance (1990) or your transplant unit.</p>
    </div>
  );
}
