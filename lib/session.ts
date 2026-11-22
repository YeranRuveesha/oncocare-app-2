import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServiceClient, createUserClient } from "@/lib/supabase/server";
import { gate, GATE_PATH, type GateResult } from "@/lib/gate";
import { HOME_FOR_ROLE, type AccountStatus, type HospitalStatus, type Role } from "@/lib/roles";

export interface Profile {
  id: string;
  user_code: string;
  role: Role;
  hospital_id: string | null;
  status: AccountStatus;
  status_reason: string | null;
  last_name: string;
  given_names: string;
  email: string;
  phone: string;
  nic: string;
  job_title: string | null;
  staff_id: string | null;
  is_primary_admin: boolean;
  photo_path: string | null;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  must_change_password: boolean;
  temp_password_expires_at: string | null;
  temp_password_used_at: string | null;
  created_by: string | null;
  created_at: string;
  activated_at: string | null;
}

export interface HospitalBrand {
  id: string;
  code: string;
  name: string;
  short_name: string;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  status: HospitalStatus;
}

export interface SessionState {
  userId: string;
  authEmail: string;
  aal: "aal1" | "aal2" | null;
  hasVerifiedTotp: boolean;
  profile: Profile | null;
  hospital: HospitalBrand | null;
  gate: GateResult;
}

export const HOSPITAL_BRAND_COLUMNS = "id, code, name, short_name, logo_path, primary_color, secondary_color, status";

/** Who is logged in, how far they are verified, and where they must go. Null = not logged in. */
export const getSessionState = cache(loadSessionState);

async function loadSessionState(): Promise<SessionState | null> {
  const supabase = await createUserClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const hasVerifiedTotp = (user.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");

  const db = createServiceClient();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  let hospital: HospitalBrand | null = null;
  if (profile?.hospital_id) {
    const { data } = await db.from("hospitals").select(HOSPITAL_BRAND_COLUMNS).eq("id", profile.hospital_id).maybeSingle<HospitalBrand>();
    hospital = data;
  }
  const aal = (aalData?.currentLevel ?? null) as SessionState["aal"];
  const result: GateResult = profile
    ? gate({
        role: profile.role,
        status: profile.status,
        mustChangePassword: profile.must_change_password,
        emailVerified: Boolean(profile.email_verified_at),
        phoneVerified: Boolean(profile.phone_verified_at),
        hasVerifiedTotp,
        aal,
        hospitalStatus: hospital?.status ?? null,
      })
    : "blocked";
  return { userId: user.id, authEmail: user.email ?? "", aal, hasVerifiedTotp, profile, hospital, gate: result };
}

export interface ActiveSession extends SessionState {
  profile: Profile;
}

/** Where should this user land right now? */
export function nextPath(s: SessionState): string {
  if (s.gate === "ok" && s.profile) return HOME_FOR_ROLE[s.profile.role];
  if (s.gate === "ok") return "/";
  return GATE_PATH[s.gate];
}

/**
 * Use at the top of every protected page. Requires: logged in, email + phone +
 * authenticator verified, AAL2 session, active account in an active hospital,
 * and (optionally) one of the given roles.
 */
export async function requirePage(roles?: Role[]): Promise<ActiveSession> {
  const s = await getSessionState();
  if (!s) redirect("/login");
  if (s.gate !== "ok" || !s.profile) redirect(nextPath(s));
  if (roles && !roles.includes(s.profile.role)) redirect(HOME_FOR_ROLE[s.profile.role]);
  return s as ActiveSession;
}
