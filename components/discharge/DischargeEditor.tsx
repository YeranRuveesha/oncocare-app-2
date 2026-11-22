"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { DischargeDoc } from "@/lib/discharge";

interface Draft { id: string; title: string; warning: boolean; text: string }

/** Hospital Admin editor. Saving always creates a NEW version; patients confirm it again. */
export default function DischargeEditor({ doc, hasOwn }: { doc: DischargeDoc; hasOwn: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(doc.title);
  const [secs, setSecs] = useState<Draft[]>(doc.sections.map((s) => ({ id: s.id, title: s.title, warning: s.type === "warning", text: s.items.join("\n") })));
  const [pdf, setPdf] = useState<File | null>(null);
  const [keepPdf, setKeepPdf] = useState(Boolean(doc.pdf_path && hasOwn));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const upd = (i: number, p: Partial<Draft>) => setSecs((a) => a.map((s, j) => (j === i ? { ...s, ...p } : s)));

  async function save() {
    setBusy(true); setMsg(null);
    const payload = {
      title,
      sections: secs.map((s, i) => ({ id: s.id || `s${i + 1}`, title: s.title, ...(s.warning ? { type: "warning" as const } : {}), items: s.text.split("\n").map((x) => x.trim()).filter(Boolean) })),
    };
    const f = new FormData();
    f.set("payload", JSON.stringify(payload));
    if (pdf) f.set("pdf", pdf); else if (keepPdf) f.set("keep_pdf", "1");
    const res = await fetch("/api/hospital/discharge", { method: "POST", body: f });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setMsg({ ok: true, t: `Saved as version ${j.version}. Patients will be asked to confirm it.` }); setPdf(null); router.refresh(); }
    else setMsg({ ok: false, t: j.error ?? "Something went wrong." });
  }

  return (
    <div className="space-y-4">
      <div><Label htmlFor="dt">Title</Label><Input id="dt" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      {secs.map((s, i) => (
        <div key={i} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-end gap-2">
            <div className="flex-1"><Label htmlFor={`st${i}`}>Section {i + 1} title</Label><Input id={`st${i}`} value={s.title} onChange={(e) => upd(i, { title: e.target.value })} /></div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove section ${i + 1}`} onClick={() => setSecs((a) => a.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
          <Label htmlFor={`si${i}`} className="mt-3 block">Lines (one per line)</Label>
          <Textarea id={`si${i}`} rows={5} value={s.text} onChange={(e) => upd(i, { text: e.target.value })} />
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={s.warning} onChange={(e) => upd(i, { warning: e.target.checked })} /> Show as a warning (red)</label>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => setSecs((a) => [...a, { id: `s${Date.now()}`, title: "", warning: false, text: "" }])}><Plus /> Add section</Button>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <Label htmlFor="pdf">Optional PDF (max 10 MB)</Label>
        <Input id="pdf" type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
        {doc.pdf_path && hasOwn && !pdf && <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={keepPdf} onChange={(e) => setKeepPdf(e.target.checked)} /> Keep the current PDF</label>}
      </div>
      <Button variant="brand" onClick={save} disabled={busy}>{busy ? "Saving…" : "Publish as a new version"}</Button>
      {msg && <p role="status" className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{msg.t}</p>}
    </div>
  );
}
