import { z } from "zod";

export const sectionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  title: z.string().trim().min(2, "Each section needs a title").max(120),
  type: z.literal("warning").optional(),
  items: z.array(z.string().trim().min(1).max(600)).min(1, "Each section needs at least one line").max(40),
});
export const dischargeSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  sections: z.array(sectionSchema).min(1, "Add at least one section").max(30),
});
export type DischargeInput = z.infer<typeof dischargeSchema>;
