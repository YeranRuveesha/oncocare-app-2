import { z } from "zod";
import { SYMPTOM_KEYS } from "@/lib/triage/symptoms";

export const CheckInSchema = z.object({
  temperatureC: z.number().min(34, "Temperature looks too low").max(43, "Temperature looks too high").optional(),
  symptoms: z.array(z.enum(SYMPTOM_KEYS as [string, ...string[]])).max(20).default([]),
  notes: z.string().trim().max(1000).optional(),
});

export const AlertStatusSchema = z
  .object({
    status: z.enum(["acknowledged", "escalated", "resolved"]).optional(),
    reply: z.string().trim().min(2, "Write a short reply").max(1000, "Please keep it under 1000 characters").optional(),
  })
  .refine((v) => v.status || v.reply, "Nothing to update");
