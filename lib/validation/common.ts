import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// ── Building blocks shared by EVERY form (browser and server use the same rules) ──

export const PASSWORD_SPECIALS = "!@#$%^&*_+-=[]{};'\"|<>?,/`~\\";
const SPECIAL_RE = /[!@#$%^&*_+\-=[\]{};'"|<>?,/`~\\]/;
const ALLOWED_RE = /^[A-Za-z0-9!@#$%^&*_+\-=[\]{};'"|<>?,/`~\\]*$/;

/** The 16-character password rules, as a checklist the UI can show. */
export function passwordChecks(pw: string) {
  return [
    { ok: pw.length === 16, label: "Exactly 16 characters" },
    { ok: /[A-Z]/.test(pw), label: "An uppercase letter (A-Z)" },
    { ok: /[a-z]/.test(pw), label: "A lowercase letter (a-z)" },
    { ok: /[0-9]/.test(pw), label: "A number (0-9)" },
    { ok: SPECIAL_RE.test(pw), label: "A special character, e.g. ! @ # $ % & * ?" },
    { ok: pw.length > 0 && ALLOWED_RE.test(pw), label: "No spaces and none of  :  (  )  ." },
  ];
}

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(1, "Password is required")
  .superRefine((pw, ctx) => {
    const failed = passwordChecks(pw).find((c) => !c.ok);
    if (failed) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Password needs: ${failed.label.toLowerCase()}` });
  });

export const requiredText = (label: string, max = 120) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const optionalText = (max = 120) =>
  z.string().trim().max(max, "Too long").optional().transform((v) => (v ? v : undefined));

export const emailSchema = z
  .string({ required_error: "Email address is required" })
  .trim()
  .min(1, "Email address is required")
  .email("Enter a valid email address")
  .max(254)
  .transform((v) => v.toLowerCase());

/** Any country. Saved in international (E.164) format, e.g. +94771234567. */
export function normalizePhone(value: string): string | null {
  const p = parsePhoneNumberFromString(value || "");
  return p && p.isValid() ? p.number : null;
}

export const phoneSchema = z
  .string({ required_error: "Telephone number is required" })
  .trim()
  .min(1, "Telephone number is required")
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid telephone number for the selected country" });
      return z.NEVER;
    }
    return n;
  });

/** Sri Lankan NIC: old (9 digits + V/X) or new (12 digits). */
export function isValidNic(raw: string): boolean {
  const v = (raw || "").trim().toUpperCase();
  let days: number;
  if (/^[0-9]{9}[VX]$/.test(v)) days = Number(v.slice(2, 5));
  else if (/^[0-9]{12}$/.test(v)) {
    const year = Number(v.slice(0, 4));
    if (year < 1900 || year > new Date().getFullYear()) return false;
    days = Number(v.slice(4, 7));
  } else return false;
  // Day of the year: 1-366 (male) or 501-866 (female).
  return (days >= 1 && days <= 366) || (days >= 501 && days <= 866);
}

export const nicSchema = z
  .string({ required_error: "NIC number is required" })
  .trim()
  .min(1, "NIC number is required")
  .transform((v) => v.toUpperCase())
  .refine(isValidNic, "Enter a valid NIC: 9 digits + V or X (e.g. 851234567V) or 12 digits (e.g. 198512345678)");

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
export function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const pastDateSchema = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .min(1, `${label} is required`)
    .regex(isoDate, `Choose ${label.toLowerCase()} from the calendar`)
    .refine((v) => v >= "1900-01-01", `${label} is not valid`)
    .refine((v) => v <= todayIso(), `${label} cannot be in the future`);

export const slmcSchema = z
  .string({ required_error: "SLMC registration number is required" })
  .trim()
  .min(1, "SLMC registration number is required")
  .regex(/^[A-Za-z0-9]{2,20}$/, "Letters and numbers only (2 to 20)")
  .transform((v) => v.toUpperCase());

export const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Choose a colour");
export const uuidSchema = z.string().uuid("Choose an option from the list");
export const reasonSchema = z.string().trim().min(3, "Please write a reason").max(500, "Reason is too long");

/** Turns a Zod error into { fieldName: "message" } for showing under each field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
