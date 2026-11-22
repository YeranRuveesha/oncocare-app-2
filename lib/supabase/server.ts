import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { config } from "@/lib/config";

/** Supabase client that acts AS the logged-in user (cookie session). Row-Level Security applies. */
export async function createUserClient() {
  const cookieStore = await cookies();
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; the middleware refreshes them instead.
        }
      },
    },
  });
}

/**
 * SERVICE ROLE client: bypasses Row-Level Security. Server code only, and only
 * AFTER checking who the user is and what they may do. Never sent to the browser.
 */
export function createServiceClient() {
  if (!config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env.local (see SETUP.md).");
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A one-off anonymous client with NO cookies. Used to check an email/phone OTP
 * without replacing the user's real login session.
 */
export function createThrowawayClient() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type ServiceClient = ReturnType<typeof createServiceClient>;
