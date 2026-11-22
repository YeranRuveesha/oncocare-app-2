// The symptom checklist shown to patients.
// PLACEHOLDER LIST: the hospital's clinical team must review and sign off
// on these before any real use.

export interface SymptomOption {
  key: string;
  label: string;
  hint?: string;
}

export const SYMPTOM_OPTIONS: SymptomOption[] = [
  { key: "rigors", label: "Shaking chills (rigors)" },
  { key: "breathing_difficulty", label: "Difficulty breathing" },
  { key: "chest_pain", label: "Chest pain" },
  { key: "confusion", label: "Confusion or unusual drowsiness" },
  { key: "bleeding", label: "Bleeding that will not stop" },
  { key: "diarrhoea", label: "Diarrhoea" },
  { key: "vomiting", label: "Vomiting" },
  { key: "new_rash", label: "New skin rash" },
  { key: "mouth_sores", label: "Painful mouth sores" },
  { key: "line_site_redness", label: "Redness or pain at central line site" },
  { key: "cough", label: "Cough" },
  { key: "nausea", label: "Nausea" },
  { key: "fatigue", label: "Tiredness" },
  { key: "poor_appetite", label: "Poor appetite" },
  { key: "headache", label: "Headache" },
];

export const SYMPTOM_KEYS = SYMPTOM_OPTIONS.map((s) => s.key);

export function symptomLabel(key: string): string {
  return SYMPTOM_OPTIONS.find((s) => s.key === key)?.label ?? key;
}
