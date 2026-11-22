"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SITE } from "@/config/site";

export default function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setErrors({}); setMsg(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(f.entries())),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setMsg({ ok: true, text: "Thank you. Your message was sent." }); form.reset(); }
      else { setErrors(j.errors ?? {}); setMsg({ ok: false, text: j.error ?? "Something went wrong." }); }
    } catch { setMsg({ ok: false, text: "Network problem. Please try again." }); }
    setBusy(false);
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-destructive" role="alert">{errors[k]}</p>;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div><Label htmlFor="c-name">Your name</Label><Input id="c-name" name="name" autoComplete="name" required aria-invalid={!!errors.name} />{err("name")}</div>
      <div><Label htmlFor="c-email">Email address</Label><Input id="c-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />{err("email")}</div>
      <div><Label htmlFor="c-hosp">Hospital (optional)</Label><Input id="c-hosp" name="hospital_name" aria-invalid={!!errors.hospital_name} />{err("hospital_name")}</div>
      <div><Label htmlFor="c-msg">Message</Label><Textarea id="c-msg" name="message" rows={5} required aria-invalid={!!errors.message} />{err("message")}</div>
      {/* Honeypot: hidden from people, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className="text-xs text-muted-foreground">Please do not include any real health details.</p>
      <Button type="submit" variant="brand" disabled={busy}>{busy ? "Sending…" : "Send message"}</Button>
      {msg && <p role="status" className={msg.ok ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{msg.text}</p>}
      <p className="text-xs text-muted-foreground">Prefer email? <a className="underline" href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a></p>
    </form>
  );
}
