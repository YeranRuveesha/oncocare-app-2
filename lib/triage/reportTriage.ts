import "server-only";
import { evaluateReportRules, symptomRule, type ReportedSymptom, type Tier } from "@/config/triage-rules";
import { classifyWithAi } from "./ai";
import { clampToTier, TIER_RANK } from "./redFlags";
import { redactText } from "./redact";

export interface ReportTriageResult {
  tier: Tier;
  urgencyScore: number;
  reasons: string[];
  redFlags: string[];
  source: "red_flag_rules" | "ai_assist" | "mock_ai";
  aiProvider: string;
  summary?: string;
}

/** Text the AI sees for one symptom: label, severity, start. No names or contact details. */
const describe = (s: ReportedSymptom) => `${symptomRule(s.key)?.label ?? s.key} (${s.severity}, started ${s.onset}${s.flag ? ", flagged" : ""})`;

/**
 * 1. Fixed safety rules (config/triage-rules.ts). 2. AI on de-identified data.
 * The AI can only RAISE the tier. It never diagnoses and sees no NIC, phone, name or address.
 */
export async function triageReport(input: { symptoms: ReportedSymptom[]; temperatureC?: number | null; dayPostTransplant?: number | null; notes?: string | null }, knownNames: string[]): Promise<ReportTriageResult> {
  const rules = evaluateReportRules(input.symptoms, input.temperatureC);
  const ai = await classifyWithAi({
    temperatureC: input.temperatureC ?? undefined,
    symptoms: input.symptoms.map(describe),
    dayPostTransplant: input.dayPostTransplant ?? undefined,
    notes: input.notes ? redactText(input.notes, knownNames) : undefined,
  });
  const tier: Tier = TIER_RANK[ai.tier] > TIER_RANK[rules.tier] ? ai.tier : rules.tier;
  const raisedByAi = tier !== rules.tier;
  const ruleMatched = !rules.reasons.includes("No red-flag rule matched");
  const reasons = raisedByAi ? [...(ruleMatched ? rules.reasons : []), ...ai.categories.map((c) => `AI noticed: ${c}`)] : rules.reasons;
  return {
    tier,
    urgencyScore: clampToTier(ruleMatched ? Math.max(ai.urgencyScore, tier === "emergency" ? 90 : tier === "urgent" ? 60 : 0) : ai.urgencyScore, tier),
    reasons: reasons.length ? reasons : ["No red-flag rule matched"],
    redFlags: rules.redFlags,
    source: ruleMatched && !raisedByAi ? "red_flag_rules" : ai.provider === "mock" ? "mock_ai" : "ai_assist",
    aiProvider: ai.provider,
    summary: ai.summary,
  };
}
