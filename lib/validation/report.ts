import { z } from "zod";
import { SYMPTOM_KEYS } from "@/config/triage-rules";

/** Removes control characters (keeps new lines) so free text is safe to store and show. */
export const cleanText = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

export const reportSchema = z
  .object({
    symptoms: z
      .array(z.object({
        key: z.enum(SYMPTOM_KEYS as [string, ...string[]]),
        severity: z.enum(["mild", "moderate", "severe"]),
        onset: z.enum(["today", "yesterday", "2-3 days", "more than 3 days"]),
        flag: z.boolean().optional(),
      }))
      .min(1, "Please choose at least one symptom")
      .max(20)
      .refine((a) => new Set(a.map((s) => s.key)).size === a.length, "A symptom was chosen twice"),
    temperatureC: z.number({ invalid_type_error: "Enter a number" }).min(34, "Please check this value").max(42, "Please check this value").optional(),
    notes: z.string().max(1000, "Please keep it under 1000 characters").transform(cleanText).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.symptoms.some((s) => s.key === "other") && !v.notes) ctx.addIssue({ code: "custom", path: ["notes"], message: "Please describe the other symptom" });
  });
export type ReportInput = z.infer<typeof reportSchema>;
