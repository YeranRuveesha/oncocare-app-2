import { z } from "zod";
import { config } from "@/lib/config";
import type { TriageTier } from "@/lib/types";

// AI-assisted symptom classification, urgency scoring and a short summary
// for the care team. This is DECISION SUPPORT ONLY:
//  - red-flag rules always run first and the AI can never lower their tier
//  - the AI only ever sees de-identified data (see redact.ts)
//  - if the AI is slow, fails, or no key is set, we fall back to the mock

export interface AiInput {
  temperatureC?: number;
  symptoms: string[];
  dayPostTransplant?: number;
  notes?: string; // already redacted
}

const AiOutputSchema = z.object({
  tier: z.enum(["routine", "urgent", "emergency"]),
  urgencyScore: z.number().min(0).max(100),
  categories: z.array(z.string()).max(6).default([]),
  summary: z.string().max(600),
});
export type AiOutput = z.infer<typeof AiOutputSchema> & { provider: string };

const SYSTEM_PROMPT = `You assist a bone marrow transplant (BMT) outpatient care team.
You receive a de-identified daily symptom check-in as JSON.
Return ONLY JSON: {"tier":"routine"|"urgent"|"emergency","urgencyScore":0-100,"categories":string[],"summary":string}.
- tier: how quickly a clinician should review it. When unsure, choose the more urgent tier.
- urgencyScore: routine 0-49, urgent 50-79, emergency 80-100.
- categories: short symptom groups, e.g. "infection risk", "GI", "skin", "respiratory".
- summary: 1-3 neutral sentences for a clinician. No diagnosis, no treatment advice, no names.`;

const TIMEOUT_MS = 8000;

export async function classifyWithAi(input: AiInput): Promise<AiOutput> {
  try {
    if (config.aiProvider === "gemini" && config.geminiApiKey) return await callGemini(input);
    if (config.aiProvider === "openai" && config.openaiApiKey) return await callOpenAi(input);
  } catch (err) {
    console.warn(`[ai] ${config.aiProvider} failed, using mock instead:`, (err as Error).message);
  }
  return mockClassify(input);
}

// "gemini-flash-latest" is Google's alias for the newest Flash model, so the
// app keeps working when Google releases or retires a version. If it is not
// available, we try a fixed version next.
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"];

async function callGemini(input: AiInput): Promise<AiOutput> {
  const models = config.aiModel ? [config.aiModel] : GEMINI_MODELS;
  let lastError: Error = new Error("No Gemini model tried");
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiApiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (res.status === 404) {
      lastError = new Error(`Gemini model ${model} not found`);
      continue;
    }
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return { ...AiOutputSchema.parse(JSON.parse(text)), provider: "gemini" };
  }
  throw lastError;
}

async function callOpenAi(input: AiInput): Promise<AiOutput> {
  const model = config.aiModel || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiApiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(input) },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return { ...AiOutputSchema.parse(JSON.parse(text)), provider: "openai" };
}

// ── Mock classifier: works offline with no API key ───────────────────────
const CATEGORY_MAP: Record<string, string> = {
  rigors: "infection risk",
  line_site_redness: "infection risk",
  cough: "respiratory",
  breathing_difficulty: "respiratory",
  chest_pain: "cardiorespiratory",
  diarrhoea: "GI",
  vomiting: "GI",
  nausea: "GI",
  poor_appetite: "GI",
  mouth_sores: "mucositis",
  new_rash: "skin",
  bleeding: "bleeding",
  confusion: "neurological",
  headache: "neurological",
  fatigue: "general",
};
const WORRY_WORDS = /\b(worse|worsening|severe|can't|cannot|unable|blood|faint|dizzy|very)\b/i;

export function mockClassify(input: AiInput): AiOutput {
  const categories = [...new Set(input.symptoms.map((s) => CATEGORY_MAP[s] ?? "other"))];
  let score = input.symptoms.length * 9;
  if (input.temperatureC !== undefined && input.temperatureC >= 37.5) score += 15;
  const worried = input.notes ? WORRY_WORDS.test(input.notes) : false;
  if (worried) score += 25;
  score = Math.min(100, score);
  const tier: TriageTier = score >= 80 ? "emergency" : score >= 50 ? "urgent" : "routine";

  const parts: string[] = [];
  if (input.dayPostTransplant !== undefined) parts.push(`Day +${input.dayPostTransplant} post-transplant.`);
  if (input.temperatureC !== undefined) parts.push(`Temperature ${input.temperatureC.toFixed(1)}°C.`);
  parts.push(
    input.symptoms.length
      ? `Reports ${input.symptoms.length} symptom(s): ${input.symptoms.join(", ").replaceAll("_", " ")}.`
      : "No symptoms ticked.",
  );
  if (worried) parts.push("Free-text notes suggest symptoms are worsening or severe.");

  return { tier, urgencyScore: score, categories, summary: parts.join(" "), provider: "mock" };
}
