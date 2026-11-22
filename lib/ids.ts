import "server-only";
import { randomInt } from "node:crypto";
import { PASSWORD_SPECIALS } from "@/lib/validation/common";
import { USER_CODE_PREFIX, type Role } from "@/lib/roles";

/** e.g. PAT-48271936. Random (not counting up), so it cannot be guessed. */
export function generateUserCode(role: Role): string {
  return `${USER_CODE_PREFIX[role]}-${String(randomInt(10_000_000, 100_000_000))}`;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
/** 6-character hospital code, e.g. K7Q2MX. */
export function generateHospitalCode(): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SPECIAL = PASSWORD_SPECIALS.replace(/["'`\\]/g, ""); // avoid characters that are hard to copy

/**
 * One-time temporary password: exactly 16 characters with upper, lower, number and
 * special characters, never : ( ) . or spaces. Uses the crypto-secure generator.
 */
export function generateTempPassword(): string {
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const chars = [
    UPPER[randomInt(UPPER.length)],
    LOWER[randomInt(LOWER.length)],
    DIGITS[randomInt(DIGITS.length)],
    SPECIAL[randomInt(SPECIAL.length)],
  ];
  while (chars.length < 16) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
