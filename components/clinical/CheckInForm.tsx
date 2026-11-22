"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SymptomOption } from "@/lib/triage/symptoms";
import { cn } from "@/lib/utils";

export default function CheckInForm({ options }: { options: SymptomOption[] }) {
  const router = useRouter();
  const [temp, setTemp] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (k: string) => setSymptoms((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        temperatureC: temp ? Number(temp) : undefined,
        symptoms,
        notes: notes.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "Could not submit");
    }
    router.push(`/patient/results/${data.checkIn.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-6">
      <Card>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {/* Days since transplant are worked out on the server from your transplant date. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="temp">Temperature (°C)</Label>
            <Input id="temp" type="number" inputMode="decimal" step="0.1" min="34" max="43" placeholder="e.g. 36.8" value={temp} onChange={(e) => setTemp(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <fieldset>
            <legend className="text-sm font-semibold">Tick anything you have today</legend>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {options.map((o) => {
                const on = symptoms.includes(o.key);
                return (
                  <label key={o.key} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors", on ? "border-brand bg-teal-soft font-semibold text-teal-dark" : "hover:bg-ice")}>
                    <input type="checkbox" className="size-4 accent-[var(--brand-accent)]" checked={on} onChange={() => toggle(o.key)} />
                    {o.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="notes">Anything else? (optional)</Label>
          <Textarea id="notes" maxLength={1000} placeholder="Describe how you feel in your own words." value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-xs text-muted-foreground">Names, phone numbers, emails and ID numbers are removed before any AI sees this.</p>
        </CardContent>
      </Card>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" variant="brand" size="lg" disabled={busy}>
        <Send aria-hidden="true" /> {busy ? "Checking…" : "Submit check-in"}
      </Button>
    </form>
  );
}
