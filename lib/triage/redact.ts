// Strips identifying details from free text BEFORE anything is sent to an AI
// provider. The AI only ever receives symptom keys, temperature, day after
// transplant and the redacted notes: never names, emails or IDs.

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"],
  [/https?:\/\/\S+|www\.\S+/gi, "[link]"],
  [/\b(?:MRN|NIC|ID|patient\s*(?:no|number|id))\s*[:#]?\s*[\w-]+/gi, "[id]"],
  [/\b\d{9}[VvXx]\b|\b\d{12}\b/g, "[id]"], // Sri Lankan NIC (old and new)
  [/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, "[date]"],
  [/(?:\+?\d[\d\s-]{6,}\d)/g, "[phone]"],
  [/\b([Mm]y name is|[Ii] am|[Ii]'m)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, "$1 [name]"],
  [/\b(Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, "[name]"],
];

export function redactText(text: string, knownNames: string[] = []): string {
  let out = text;
  for (const name of knownNames) {
    for (const part of name.split(/\s+/).filter((p) => p.length > 1)) {
      out = out.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi"), "[name]");
    }
  }
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out.slice(0, 500).trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
