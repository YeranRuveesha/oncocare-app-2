import "server-only";
import { NextResponse } from "next/server";
import type { z, ZodTypeAny } from "zod";
import { fieldErrors } from "@/lib/validation/common";
import { getSessionState, type ActiveSession, type SessionState } from "@/lib/session";
import type { Role } from "@/lib/roles";

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function fail(message: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: message, errors }, { status });
}

export const GENERIC_LOGIN_ERROR = "Invalid credentials";

/** Parse a JSON body with a shared Zod schema. Returns field errors on failure. */
export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<{ data: z.output<S> } | { response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: fail("Invalid request") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { response: fail("Please fix the highlighted fields", 422, fieldErrors(parsed.error)) };
  return { data: parsed.data };
}

/** API version of requirePage: full verification + AAL2 + active + role. */
export async function guardApi(roles?: Role[]): Promise<{ session: ActiveSession } | { response: NextResponse }> {
  const s = await getSessionState();
  if (!s) return { response: fail("Please log in", 401) };
  if (s.gate !== "ok" || !s.profile) return { response: fail("Your account is not ready to use this yet", 403) };
  if (roles && !roles.includes(s.profile.role)) return { response: fail("Not allowed", 403) };
  return { session: s as ActiveSession };
}

/** For onboarding steps: logged in with a profile, any verification state. */
export async function guardSession(): Promise<{ session: SessionState & { profile: NonNullable<SessionState["profile"]> } } | { response: NextResponse }> {
  const s = await getSessionState();
  if (!s || !s.profile) return { response: fail("Please log in again", 401) };
  if (s.gate === "blocked") return { response: fail(GENERIC_LOGIN_ERROR, 403) };
  return { session: s as SessionState & { profile: NonNullable<SessionState["profile"]> } };
}
