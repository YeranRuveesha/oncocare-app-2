// ─────────────────────────────────────────────────────────────────────────────
// Symptom-to-urgency rules for "Report Symptoms". ONE file, easy to review.
//
// TODO: clinician approval required before launch.
// These are STARTING rules for a student demo, written from the "When to call the
// doctor" list. A transplant team must review and change them before real use.
//
// How it works: every ticked symptom has a severity (mild / moderate / severe) and a
// start time. Each symptom lists rules; the HIGHEST tier that matches wins.
// If nothing matches, the report is "routine". The AI can only RAISE the result.
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = "mild" | "moderate" | "severe";
export type Onset = "today" | "yesterday" | "2-3 days" | "more than 3 days";
export type Tier = "routine" | "urgent" | "emergency";

export const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];
export const ONSETS: { value: Onset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "2-3 days", label: "2-3 days ago" },
  { value: "more than 3 days", label: "More than 3 days" },
];

/** Fever line used everywhere (also by the Daily Log and the charts). */
export const FEVER_C = 38.0;

export interface Rule {
  tier: "urgent" | "emergency";
  /** Matches only these severities (leave out = any). */
  severity?: Severity[];
  /** Matches only these start times (leave out = any). */
  onset?: Onset[];
  /** Matches only if the patient answered "yes" to the extra question of this symptom. */
  flag?: boolean;
  /** Plain-language reason shown to the patient and the clinician. */
  reason: string;
}

export interface SymptomRule {
  key: string;
  label: string;
  /** Short help text under the tick box. */
  help: string;
  /** Optional extra yes/no question that can raise the tier. */
  flagQuestion?: string;
  rules: Rule[];
  /** This symptom needs the free-text box. */
  needsText?: boolean;
  /** A photo may be attached (skin rash only). */
  photo?: boolean;
}

const ANY: Severity[] = ["mild", "moderate", "severe"];
const MOD_SEV: Severity[] = ["moderate", "severe"];

export const SYMPTOM_RULES: SymptomRule[] = [
  { key: "diarrhoea", label: "Diarrhoea that does not go away, or is bloody", help: "Loose stools many times a day, or any blood in them.",
    flagQuestion: "Is there blood in the stool?",
    rules: [
      { tier: "emergency", flag: true, reason: "Bloody diarrhoea" },
      { tier: "urgent", severity: MOD_SEV, reason: "Diarrhoea that is moderate or severe" },
      { tier: "urgent", onset: ["more than 3 days"], reason: "Diarrhoea that has lasted more than 3 days" },
    ] },
  { key: "nausea_vomiting", label: "Severe nausea, vomiting or loss of appetite", help: "Feeling sick, being sick, or not wanting to eat.",
    rules: [{ tier: "urgent", severity: ["severe"], reason: "Severe nausea, vomiting or loss of appetite" }] },
  { key: "cannot_eat_drink", label: "You cannot eat or drink", help: "You cannot keep food or fluids down, or cannot swallow.",
    rules: [{ tier: "emergency", severity: ANY, reason: "Cannot eat or drink" }] },
  { key: "weakness", label: "Extreme weakness", help: "Too weak to get out of bed or do simple things.",
    rules: [{ tier: "urgent", severity: ["severe"], reason: "Extreme weakness" }] },
  { key: "iv_line", label: "Redness, swelling or draining at an IV line", help: "Where a tube (central line or IV) goes into the skin.",
    rules: [{ tier: "urgent", severity: ANY, reason: "Redness, swelling or draining at an IV line" }] },
  { key: "abdominal_pain", label: "Pain in your abdomen (tummy)", help: "Pain or cramps in the tummy area.",
    rules: [{ tier: "urgent", severity: MOD_SEV, reason: "Abdominal pain that is moderate or severe" }] },
  { key: "fever_chills", label: "Fever, chills or sweats", help: "These may be signs of infection. Take your temperature below.",
    rules: [{ tier: "urgent", severity: MOD_SEV, reason: "Chills or sweats that are moderate or severe" }] },
  { key: "rash", label: "A new skin rash or blisters", help: "A new rash, redness, or blisters anywhere on your skin.", photo: true,
    rules: [{ tier: "urgent", severity: ANY, reason: "New skin rash or blisters" }] },
  { key: "jaundice", label: "Jaundice (yellow skin or eyes)", help: "Your skin or the whites of your eyes look yellow.",
    rules: [{ tier: "urgent", severity: ANY, reason: "Jaundice" }] },
  { key: "headache", label: "A very bad or lasting headache", help: "A headache that is very bad or does not go away.",
    rules: [
      { tier: "urgent", severity: ["severe"], reason: "Very bad headache" },
      { tier: "urgent", onset: ["more than 3 days"], severity: MOD_SEV, reason: "Headache that has lasted more than 3 days" },
    ] },
  { key: "cough", label: "A cough that is getting worse", help: "A cough that is getting worse over time.",
    rules: [{ tier: "urgent", severity: MOD_SEV, reason: "Cough that is getting worse" }] },
  { key: "breathing", label: "Trouble breathing at rest or with simple tasks", help: "Short of breath sitting still, or when doing small things.",
    rules: [{ tier: "emergency", severity: ANY, reason: "Trouble breathing" }] },
  { key: "urinating", label: "Burning when you urinate (pass urine)", help: "Pain or burning when passing urine.",
    rules: [{ tier: "urgent", severity: MOD_SEV, reason: "Burning when passing urine" }] },
  // Extra item that is not in the document (bleeding is a key transplant risk).
  { key: "bleeding", label: "Bleeding or bruising", help: "Nosebleeds, bleeding gums, blood in urine or stool, or bruises you cannot explain.",
    rules: [
      { tier: "emergency", severity: ["severe"], reason: "Severe bleeding" },
      { tier: "urgent", severity: ["mild", "moderate"], reason: "Bleeding or unexplained bruising (platelets may be low)" },
    ] },
  { key: "other", label: "Other symptom", help: "Something else that worries you. Describe it below.", needsText: true, rules: [] },
];

export const SYMPTOM_KEYS = SYMPTOM_RULES.map((s) => s.key);
export const symptomRule = (key: string) => SYMPTOM_RULES.find((s) => s.key === key);

export interface ReportedSymptom { key: string; severity: Severity; onset: Onset; flag?: boolean }
export interface RuleResult { tier: Tier; reasons: string[]; redFlags: string[] }

const RANK: Record<Tier, number> = { routine: 0, urgent: 1, emergency: 2 };

/** Deterministic rules. Runs BEFORE any AI and its result can never be lowered by the AI. */
export function evaluateReportRules(symptoms: ReportedSymptom[], temperatureC?: number | null): RuleResult {
  let tier: Tier = "routine";
  const reasons: string[] = [];
  const redFlags: string[] = [];
  const bump = (t: Tier, reason: string, flag = true) => {
    if (RANK[t] > RANK[tier]) tier = t;
    if (!reasons.includes(reason)) reasons.push(reason);
    if (flag && t === "emergency" && !redFlags.includes(reason)) redFlags.push(reason);
  };
  if (temperatureC != null && temperatureC >= FEVER_C) bump("emergency", `Temperature ${temperatureC.toFixed(1)} °C (fever of ${FEVER_C.toFixed(1)} °C or higher)`);
  if (temperatureC != null && temperatureC >= FEVER_C && symptoms.some((s) => s.key === "fever_chills")) bump("emergency", "Chills or sweats with a fever");
  for (const s of symptoms) {
    const def = symptomRule(s.key);
    if (!def) continue;
    for (const r of def.rules) {
      if (r.severity && !r.severity.includes(s.severity)) continue;
      if (r.onset && !r.onset.includes(s.onset)) continue;
      if (r.flag !== undefined && Boolean(s.flag) !== r.flag) continue;
      bump(r.tier, r.reason);
    }
  }
  if (tier === "routine") reasons.push("No red-flag rule matched");
  return { tier, reasons, redFlags };
}

/** Plain-language next steps shown to the patient for each tier. */
export const NEXT_STEPS: Record<Tier, { title: string; steps: string[] }> = {
  emergency: {
    title: "Get help now",
    steps: ["Call the ambulance (1990) or go to the nearest hospital emergency department now.", "Call your transplant unit on the way if you can.", "Do not wait for a reply from this app."],
  },
  urgent: {
    title: "Your care team should hear about this today",
    steps: ["A senior doctor will look at your report as soon as possible.", "Please keep your phone with you and call your transplant unit if you feel worse.", "If you have trouble breathing or severe bleeding, call 1990 straight away."],
  },
  routine: {
    title: "Your care team will review this",
    steps: ["A doctor will look at your report soon.", "Keep taking your daily log.", "If anything gets worse, send a new report or call your transplant unit."],
  },
};
