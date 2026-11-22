/**
 * Creates the FIRST platform Admin (there is no public sign-up for Admins).
 *
 *   npm run create-admin -- --email you@example.com --phone +94770000001 --nic 851234567V --last Perera --given "Dulran"
 *
 * Prints a User ID (SUP-xxxxxxxx) and a one-time temporary password (16 characters, valid 48 hours).
 * Then open http://localhost:3000/activate and finish: new password → email code → phone code → authenticator QR.
 */
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const email = (arg("email") ?? "").trim().toLowerCase();
const phoneRaw = arg("phone") ?? "";
const nic = (arg("nic") ?? "").trim().toUpperCase();
const last = (arg("last") ?? "").trim();
const given = (arg("given") ?? "").trim();
const phone = parsePhoneNumberFromString(phoneRaw);
const problems: string[] = [];
if (!/^\S+@\S+\.\S+$/.test(email)) problems.push("--email must be a valid email");
if (!phone?.isValid()) problems.push("--phone must be an international number, e.g. +94770000001");
if (!/^([0-9]{9}[VX]|[0-9]{12})$/.test(nic)) problems.push("--nic must be 9 digits + V/X or 12 digits");
if (!last || !given) problems.push("--last and --given (names) are required");
if (problems.length) {
  console.error("Please fix:\n - " + problems.join("\n - "));
  process.exit(1);
}

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ", LOWER = "abcdefghijkmnopqrstuvwxyz", DIGITS = "23456789", SPECIAL = "!@#$%^&*_+-=[]{};|<>?,/~";
function tempPassword() {
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const c = [UPPER, LOWER, DIGITS, SPECIAL].map((s) => s[randomInt(s.length)]);
  while (c.length < 16) c.push(all[randomInt(all.length)]);
  for (let i = c.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c.join("");
}

async function main() {
  const db = createClient(url!, key!, { auth: { persistSession: false } });
  const password = tempPassword();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create the login");
  const userCode = `SUP-${randomInt(10_000_000, 100_000_000)}`;
  const { error: pe } = await db.from("profiles").insert({
    id: data.user.id,
    user_code: userCode,
    role: "platform_admin",
    hospital_id: null,
    status: "pending_verification",
    last_name: last,
    given_names: given,
    email,
    phone: phone!.number,
    nic,
    must_change_password: true,
    temp_password_expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  });
  if (pe) {
    await db.auth.admin.deleteUser(data.user.id);
    throw new Error(pe.message);
  }
  await db.from("audit_logs").insert({ actor_id: null, actor_role: "system", action: "admin.created_by_script", target_type: "platform_admin", target_id: data.user.id, target_label: userCode });
  console.log("\n✅ First Admin created\n");
  console.log(`   User ID:            ${userCode}`);
  console.log(`   Temporary password: ${password}`);
  console.log("\n   This password is shown ONCE, works once and expires in 48 hours.");
  console.log("   Next: open http://localhost:3000/activate\n");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
