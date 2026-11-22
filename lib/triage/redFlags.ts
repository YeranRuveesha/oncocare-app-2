import type { SymptomReport, TriageTier } from "@/lib/types";
import { symptomLabel } from "./symptoms";

// Hard-coded red-flag rules. They run FIRST, on every check-in, and never
// depend on AI. If a rule matches, the tier is fixed by the rule: the AI can
// add a summary but can never lower it.
//
// PLACEHOLDER RULES: these must be written and signed off by the hospital's
// clinical team before any real use.

export const FEVER_THRESHOLD_C = 38.0;
export const EMERGENCY_SYMPTOMS = ["rigors", "breathing_difficulty", "chest_pain", "confusion", "bleeding"];
export const URGENT_SYMPTOMS = ["diarrhoea", "vomiting", "new_rash", "mouth_sores", "line_site_redness"];

export interface RedFlagResult {
  tier: Exclude<TriageTier, "routine">;
  urgencyScore: number;
  reasons: string[];
}

export function checkRedFlags(report: SymptomReport): RedFlagResult | null {
  const emergency: string[] = [];

  if (report.temperatureC !== undefined && report.temperatureC >= FEVER_THRESHOLD_C) {
    emergency.push(`Temperature ${report.temperatureC.toFixed(1)}°C (fever ≥ ${FEVER_THRESHOLD_C}°C)`);
  }
  for (const s of report.symptoms) {
    if (EMERGENCY_SYMPTOMS.includes(s)) emergency.push(`Reported: ${symptomLabel(s)}`);
  }
  if (emergency.length) {
    return { tier: "emergency", urgencyScore: Math.min(100, 88 + emergency.length * 4), reasons: emergency };
  }

  const urgent = report.symptoms.filter((s) => URGENT_SYMPTOMS.includes(s));
  if (urgent.length) {
    return {
      tier: "urgent",
      urgencyScore: Math.min(79, 55 + urgent.length * 6),
      reasons: urgent.map((s) => `Reported: ${symptomLabel(s)}`),
    };
  }
  return null;
}

/** Score range for each tier, so AI scores stay consistent with the tier. */
export const TIER_BANDS: Record<TriageTier, [number, number]> = {
  routine: [0, 49],
  urgent: [50, 79],
  emergency: [80, 100],
};

export const TIER_RANK: Record<TriageTier, number> = { routine: 0, urgent: 1, emergency: 2 };

export function clampToTier(score: number, tier: TriageTier): number {
  const [lo, hi] = TIER_BANDS[tier];
  return Math.round(Math.max(lo, Math.min(hi, score)));
}
