import type { SymptomReport, TriageResult } from "@/lib/types";
import { checkRedFlags, clampToTier, TIER_RANK } from "./redFlags";
import { redactText } from "./redact";
import { classifyWithAi } from "./ai";

/**
 * Full triage pipeline for one check-in.
 * 1. Red-flag rules (always, no AI). A match fixes a minimum tier.
 * 2. AI (or mock) on de-identified data: may RAISE the tier, never lower it.
 */
export async function runTriage(report: SymptomReport, knownNames: string[] = []): Promise<TriageResult> {
  const flagged = checkRedFlags(report);

  const ai = await classifyWithAi({
    temperatureC: report.temperatureC,
    symptoms: report.symptoms,
    dayPostTransplant: report.dayPostTransplant,
    notes: report.notes ? redactText(report.notes, knownNames) : undefined,
  });
  const aiSource = ai.provider === "mock" ? "mock_ai" : "ai_assist";

  if (flagged) {
    const tier = TIER_RANK[ai.tier] > TIER_RANK[flagged.tier] ? ai.tier : flagged.tier;
    return {
      tier,
      urgencyScore: clampToTier(Math.max(flagged.urgencyScore, ai.urgencyScore), tier),
      reasons: flagged.reasons,
      source: "red_flag_rules",
      aiProvider: ai.provider,
      summary: ai.summary,
    };
  }

  return {
    tier: ai.tier,
    urgencyScore: clampToTier(ai.urgencyScore, ai.tier),
    reasons: ai.categories.length ? ai.categories.map((c) => `AI category: ${c}`) : ["No red-flag rule matched"],
    source: aiSource,
    aiProvider: ai.provider,
    summary: ai.summary,
  };
}
