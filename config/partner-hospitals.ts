// Hospitals shown on the landing page. EDIT THIS FILE to add or change a hospital.
//
// IMPORTANT: every hospital stays "prototype" ("Designed for") until you have WRITTEN
// permission from that hospital. Only then change its status to "pilot" or "partner".
// Never add a hospital's official logo or trademark without written permission.
export type HospitalStatus = "prototype" | "pilot" | "partner";

export interface PartnerHospital {
  name: string;
  shortName: string;
  type: "government" | "private";
  city: string;
  status: HospitalStatus;
  /** Optional logo path. Leave out unless the hospital gave written permission. */
  logo?: string;
}

export const STATUS_BADGE: Record<HospitalStatus, string> = {
  prototype: "Designed for",
  pilot: "Pilot",
  partner: "Partner",
};

export const PARTNER_HOSPITALS: PartnerHospital[] = [
  { name: "National Hospital of Sri Lanka", shortName: "NHSL", type: "government", city: "Colombo", status: "prototype" },
  { name: "Durdans Hospital", shortName: "Durdans", type: "private", city: "Colombo", status: "prototype" },
  { name: "Lanka Hospitals", shortName: "Lanka Hospitals", type: "private", city: "Colombo", status: "prototype" },
];
