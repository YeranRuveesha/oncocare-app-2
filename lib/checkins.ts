import "server-only";
import type { CheckIn } from "@/lib/types";
import { fullName } from "@/lib/roles";

/** Supabase rows (log + alert + patient name) → CheckIn objects for the UI. */
export function toCheckIns(rows: Array<Record<string, unknown>>, names: Map<string, string>): CheckIn[] {
  return rows.map((r) => {
    const a = (Array.isArray(r.triage_alerts) ? r.triage_alerts[0] : r.triage_alerts) as Record<string, unknown>;
    return {
      id: String(r.id),
      patientId: String(r.patient_id),
      patientName: names.get(String(r.patient_id)) ?? "Patient",
      createdAt: String(r.created_at),
      temperatureC: r.temperature_c === null ? undefined : Number(r.temperature_c),
      symptoms: (r.symptoms as string[]) ?? [],
      notes: (r.notes as string) ?? undefined,
      dayPostTransplant: r.day_post_transplant === null ? undefined : Number(r.day_post_transplant),
      structured: Array.isArray(r.structured) && r.structured.length ? (r.structured as CheckIn["structured"]) : undefined,
      hasPhoto: Boolean(r.photo_path),
      redFlags: (r.red_flags as string[]) ?? [],
      reply: (a?.clinician_reply as string) ?? undefined,
      status: (a?.status as CheckIn["status"]) ?? "open",
      triage: {
        tier: (a?.tier as CheckIn["triage"]["tier"]) ?? "routine",
        urgencyScore: Number(a?.urgency_score ?? 0),
        reasons: (a?.reasons as string[]) ?? [],
        source: (a?.source as CheckIn["triage"]["source"]) ?? "mock_ai",
        aiProvider: String(a?.ai_provider ?? ""),
        summary: (a?.ai_summary as string) ?? undefined,
      },
    };
  });
}

export function nameMap(people: Array<{ id: string; given_names: string; last_name: string }>) {
  return new Map(people.map((p) => [p.id, fullName(p)]));
}
