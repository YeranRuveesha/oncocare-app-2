import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 10 * 60 * 1000;

/** Is this key (e.g. "login:1.2.3.4") locked after too many failures? */
export async function isLocked(key: string): Promise<boolean> {
  const db = createServiceClient();
  const { data } = await db.from("rate_limits").select("locked_until").eq("key", key).maybeSingle();
  return Boolean(data?.locked_until && new Date(data.locked_until).getTime() > Date.now());
}

export async function anyLocked(keys: string[]) {
  for (const k of keys) if (await isLocked(k)) return true;
  return false;
}

/** Count one failure; the 5th failure in 15 minutes locks the key for 10 minutes. */
export async function recordFailure(keys: string[]) {
  const db = createServiceClient();
  for (const key of keys) {
    const { data } = await db.from("rate_limits").select("*").eq("key", key).maybeSingle();
    const now = Date.now();
    const fresh = !data || now - new Date(data.first_failure_at).getTime() > WINDOW_MS;
    const failures = fresh ? 1 : data.failures + 1;
    await db.from("rate_limits").upsert({
      key,
      failures: failures >= MAX_FAILURES ? 0 : failures,
      first_failure_at: fresh ? new Date(now).toISOString() : data.first_failure_at,
      locked_until: failures >= MAX_FAILURES ? new Date(now + LOCK_MS).toISOString() : data?.locked_until ?? null,
    });
  }
}

export async function clearFailures(keys: string[]) {
  const db = createServiceClient();
  await db.from("rate_limits").delete().in("key", keys);
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export const LOCKED_MESSAGE = "Too many attempts. Please wait 10 minutes and try again.";
