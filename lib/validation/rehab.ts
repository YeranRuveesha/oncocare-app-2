import { z } from "zod";
import { cleanText } from "@/lib/validation/report";

export const exerciseLogSchema = z.object({
  exercise_id: z.string().uuid(),
  minutes: z.number({ invalid_type_error: "Please check this value" }).int().min(1, "At least 1 minute").max(300, "Please check this value"),
  effort: z.number().int().min(0).max(10),
  symptoms: z.boolean(),
  symptom_note: z.string().max(300, "Please keep it under 300 characters").transform(cleanText).nullable().optional(),
});

const reason = z.string({ required_error: "A reason is required" }).trim().min(3, "Please give a short reason").max(300, "Please keep the reason under 300 characters").transform(cleanText);

export const rehabChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set"), exercise_id: z.string().uuid(), status: z.enum(["allowed", "restricted"]), target: z.string().trim().max(100).optional(), reason }),
  z.object({ action: z.literal("remove"), exercise_id: z.string().uuid(), reason }),
  z.object({ action: z.literal("pause"), reason }),
  z.object({ action: z.literal("resume"), reason }),
  z.object({ action: z.literal("walking_target"), minutes: z.number().int().min(5).max(240), reason }),
]);
export type RehabChange = z.infer<typeof rehabChangeSchema>;
