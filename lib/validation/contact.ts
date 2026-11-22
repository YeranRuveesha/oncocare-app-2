import { z } from "zod";
import { emailSchema, requiredText } from "@/lib/validation/common";

export const contactSchema = z.object({
  name: requiredText("Name", 100).pipe(z.string().min(2, "Name is too short")),
  email: emailSchema,
  hospital_name: z.string().trim().max(150, "Too long").optional().transform((v) => v || undefined),
  message: z.string({ required_error: "Message is required" }).trim().min(10, "Please write at least 10 characters").max(2000, "Please keep it under 2000 characters"),
  /** Honeypot: real people leave this empty. */
  website: z.string().max(200).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;
