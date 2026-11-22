import { z } from "zod";

/** Re-verification for the Admin's direct edit: current password + a fresh 6-digit authenticator code. */
export const adminProfileSchema = z.object({
  password: z.string().min(1, "Enter your current password").max(200),
  totp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  last_name: z.string().optional(),
  given_names: z.string().optional(),
  nic: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});
export type AdminProfileInput = z.infer<typeof adminProfileSchema>;
