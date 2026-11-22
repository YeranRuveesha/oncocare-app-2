// The 4 kinds of user. Clinicians have 2 sub-roles.
export type Role = "patient" | "junior_doctor" | "senior_consultant" | "hospital_admin" | "platform_admin";
export const ROLES: Role[] = ["patient", "junior_doctor", "senior_consultant", "hospital_admin", "platform_admin"];
export const CLINICIAN_ROLES = ["junior_doctor", "senior_consultant"] as const;
export type ClinicianRole = (typeof CLINICIAN_ROLES)[number];

/** The 4 role cards on /signup and /login. */
export type RoleCard = "patient" | "clinician" | "hospital-admin" | "admin";
export const ROLE_CARDS: RoleCard[] = ["patient", "clinician", "hospital-admin", "admin"];

export type AccountStatus = "pending_verification" | "pending_approval" | "active" | "rejected" | "deactivated";
export type HospitalStatus = "awaiting_admin_setup" | "active" | "deactivated";

export const ROLE_LABEL: Record<Role, string> = {
  patient: "Patient",
  junior_doctor: "Junior Doctor",
  senior_consultant: "Senior Consultant",
  hospital_admin: "Hospital Admin",
  platform_admin: "Admin",
};

export const CARD_LABEL: Record<RoleCard, string> = {
  patient: "Patient",
  clinician: "Clinician",
  "hospital-admin": "Hospital Admin",
  admin: "Admin",
};

export const STATUS_LABEL: Record<AccountStatus, string> = {
  pending_verification: "Verification not finished",
  pending_approval: "Waiting for approval",
  active: "Active",
  rejected: "Rejected",
  deactivated: "Deactivated",
};

export const HOSPITAL_STATUS_LABEL: Record<HospitalStatus, string> = {
  awaiting_admin_setup: "Awaiting admin setup",
  active: "Active",
  deactivated: "Deactivated",
};

export function isClinician(role: Role | string | null | undefined): role is ClinicianRole {
  return role === "junior_doctor" || role === "senior_consultant";
}

export function cardForRole(role: Role): RoleCard {
  if (role === "patient") return "patient";
  if (isClinician(role)) return "clinician";
  if (role === "hospital_admin") return "hospital-admin";
  return "admin";
}

export const USER_CODE_PREFIX: Record<Role, "PAT" | "CLN" | "ADM" | "SUP"> = {
  patient: "PAT",
  junior_doctor: "CLN",
  senior_consultant: "CLN",
  hospital_admin: "ADM",
  platform_admin: "SUP",
};

export const HOME_FOR_ROLE: Record<Role, string> = {
  patient: "/patient",
  junior_doctor: "/clinician",
  senior_consultant: "/clinician",
  hospital_admin: "/hospital",
  platform_admin: "/admin",
};

/** Hospital Admins and Admins may also log in with their User ID. */
export function cardAllowsUserId(card: RoleCard) {
  return card === "hospital-admin" || card === "admin";
}

export function fullName(p: { given_names: string; last_name: string }) {
  return `${p.given_names} ${p.last_name}`.trim();
}
