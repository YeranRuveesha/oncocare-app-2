// Pure rules for "where must this user go next?" (unit-tested in tests/gate.test.ts).
import type { AccountStatus, HospitalStatus, Role } from "@/lib/roles";

export interface GateInput {
  role: Role;
  status: AccountStatus;
  mustChangePassword: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasVerifiedTotp: boolean;
  aal: "aal1" | "aal2" | null;
  hospitalStatus: HospitalStatus | null;
}

export type GateResult = "blocked" | "onboarding" | "mfa" | "waiting" | "ok";

export function gate(g: GateInput): GateResult {
  if (g.status === "deactivated" || g.hospitalStatus === "deactivated") return "blocked";
  if (g.mustChangePassword || !g.emailVerified || !g.phoneVerified || !g.hasVerifiedTotp || g.status === "pending_verification") {
    return "onboarding";
  }
  if (g.aal !== "aal2") return "mfa";
  if (g.status === "pending_approval" || g.status === "rejected") return "waiting";
  return "ok";
}

export const GATE_PATH: Record<Exclude<GateResult, "ok">, string> = {
  blocked: "/blocked",
  onboarding: "/onboarding",
  mfa: "/login/verify",
  waiting: "/waiting",
};
