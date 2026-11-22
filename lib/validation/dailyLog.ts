import { z } from "zod";
import { cleanText } from "@/lib/validation/report";

// ONE schema for the browser and the server. Ranges match the database CHECK constraints.
const bad = "Please check this value";
const int = (min: number, max: number) => z.number({ invalid_type_error: bad, required_error: "Required" }).int(bad).min(min, bad).max(max, bad);

export const dailyLogSchema = z
  .object({
    /** YYYY-MM-DD. Left out = today. The server allows today and the previous 3 days only. */
    log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    // vitals
    temperature_c: z.number({ invalid_type_error: bad, required_error: "Required" }).min(34, bad).max(42, bad),
    heart_rate: int(30, 220),
    bp_systolic: int(60, 260),
    bp_diastolic: int(30, 160),
    spo2: int(70, 100).nullable().optional(),
    weight_kg: z.number({ invalid_type_error: bad }).min(10, bad).max(300, bad).nullable().optional(),
    // how I feel
    pain: int(0, 10),
    fatigue: int(0, 10),
    appetite: z.enum(["Good", "Reduced", "Poor"]),
    nausea: z.enum(["None", "Mild", "Severe"]),
    vomiting_episodes: int(0, 50),
    loose_stools: int(0, 50),
    bleeding: z.boolean(),
    // self-care
    mouth_brushing: int(0, 6),
    mouth_flossed: z.boolean(),
    mouth_rinses: int(0, 8),
    lip_care: z.boolean(),
    emollient_times: int(0, 10),
    sun_protection: z.enum(["Yes", "No", "Stayed indoors"]),
    walking_minutes: int(0, 600),
    medicines: z.enum(["Yes", "Partly", "No"]),
    notes: z.string().max(500, "Please keep it under 500 characters").transform(cleanText).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (Number.isFinite(v.bp_systolic) && Number.isFinite(v.bp_diastolic) && v.bp_systolic <= v.bp_diastolic) {
      ctx.addIssue({ code: "custom", path: ["bp_systolic"], message: "The top number must be higher than the bottom number" });
    }
  });
export type DailyLogInput = z.infer<typeof dailyLogSchema>;

export const FIELD_KEYS = [
  "temperature_c", "heart_rate", "bp_systolic", "bp_diastolic", "spo2", "weight_kg", "pain", "fatigue", "appetite", "nausea", "vomiting_episodes", "loose_stools", "bleeding",
  "mouth_brushing", "mouth_flossed", "mouth_rinses", "lip_care", "emollient_times", "sun_protection", "walking_minutes", "medicines", "notes",
] as const;

export const fToC = (f: number) => Math.round(((f - 32) * 5) / 9 * 10) / 10;
export const cToF = (c: number) => Math.round((c * 9) / 5 * 10 + 320) / 10;

/** Valid but worth attention. Never a diagnosis. */
export function concerning(v: { temperature_c?: number | null; bleeding?: boolean | null; spo2?: number | null }): string | null {
  if (v.temperature_c != null && v.temperature_c >= 38.0) return "Your temperature is 38.0 °C or higher.";
  if (v.bleeding) return "You noted bleeding or bruising.";
  if (v.spo2 != null && v.spo2 < 92) return "Your oxygen level looks low.";
  return null;
}

export type LogDot = "red" | "amber" | "green";
export function logDot(v: { temperature_c: number | null; bleeding: boolean | null; spo2: number | null; pain: number | null; medicines: string | null }): LogDot {
  if ((v.temperature_c ?? 0) >= 38) return "red";
  if (v.bleeding || (v.spo2 != null && v.spo2 < 92) || (v.pain ?? 0) >= 7 || v.medicines === "No") return "amber";
  return "green";
}
