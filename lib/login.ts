import "server-only";
import { normalizePhone } from "@/lib/validation/common";
import { anyLocked, clearFailures, clientIp, recordFailure } from "@/lib/rateLimit";
import { cardAllowsUserId, cardForRole, type RoleCard } from "@/lib/roles";
import type { Profile } from "@/lib/session";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";

export type LoginOutcome = { ok: true; profile: Profile } | { ok: false; locked?: boolean };

const USER_ID_RE = /^(PAT|CLN|ADM|SUP)-\d{8}$/i;

/** Finds the profile for an email, telephone number or User ID. */
async function findProfile(identifier: string, allowUserId: boolean): Promise<Profile | null> {
  const db = createServiceClient();
  const id = identifier.trim();
  let column: "email" | "phone" | "user_code";
  let value: string;
  if (id.includes("@")) {
    column = "email";
    value = id.toLowerCase();
  } else if (USER_ID_RE.test(id)) {
    if (!allowUserId) return null;
    column = "user_code";
    value = id.toUpperCase();
  } else {
    const phone = normalizePhone(id.startsWith("+") ? id : `+${id.replace(/^00/, "")}`);
    if (!phone) return null;
    column = "phone";
    value = phone;
  }
  const { data } = await db.from("profiles").select("*").eq(column, value).maybeSingle<Profile>();
  return data;
}

/**
 * Password step of login (normal login AND first-login activation).
 * The email linked to a phone/User ID is looked up HERE and never sent to the browser.
 * Every failure looks the same to the browser: "Invalid credentials".
 */
export async function passwordLogin(
  req: Request,
  opts: { identifier: string; password: string; cards: RoleCard[]; activation?: boolean },
): Promise<LoginOutcome> {
  const ip = clientIp(req);
  const keys = [`login:ip:${ip}`, `login:id:${opts.identifier.trim().toLowerCase()}`];
  if (await anyLocked(keys)) return { ok: false, locked: true };

  const fail = async (): Promise<LoginOutcome> => {
    await recordFailure(keys);
    return { ok: false };
  };

  const profile = await findProfile(opts.identifier, opts.cards.some(cardAllowsUserId));
  // The real role must match the chosen card. We never say "wrong role".
  if (!profile || !opts.cards.includes(cardForRole(profile.role))) return fail();

  const db = createServiceClient();
  const { data: authUser } = await db.auth.admin.getUserById(profile.id);
  const email = authUser.user?.email;
  if (!email) return fail();

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: opts.password });
  if (error) return fail();

  // Blocked accounts, blocked hospitals and expired / used temporary passwords.
  let blocked = profile.status === "deactivated";
  if (profile.hospital_id) {
    const { data: h } = await db.from("hospitals").select("status").eq("id", profile.hospital_id).maybeSingle();
    if (h?.status === "deactivated") blocked = true;
  }
  if (profile.must_change_password && profile.temp_password_expires_at) {
    const expired = new Date(profile.temp_password_expires_at).getTime() < Date.now();
    if (expired || profile.temp_password_used_at) blocked = true;
  }
  if (opts.activation && !profile.must_change_password) blocked = true; // already activated: use normal login
  if (blocked) {
    await supabase.auth.signOut({ scope: "local" });
    return fail();
  }

  // A temporary password works only once.
  if (profile.must_change_password && profile.temp_password_expires_at) {
    await db.from("profiles").update({ temp_password_used_at: new Date().toISOString() }).eq("id", profile.id);
  }
  await clearFailures(keys);
  return { ok: true, profile };
}
