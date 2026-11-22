// Shared types for triage (check-ins). Account/role types live in lib/roles.ts.
export type TriageTier = "routine" | "urgent" | "emergency";
export type AlertStatus = "open" | "acknowledged" | "escalated" | "resolved";
export type TriageSource = "red_flag_rules" | "ai_assist" | "mock_ai";

export interface SymptomReport {
  temperatureC?: number;
  symptoms: string[]; // keys from lib/triage/symptoms.ts
  notes?: string;
  dayPostTransplant?: number;
}

export interface TriageResult {
  tier: TriageTier;
  urgencyScore: number; // 0 to 100
  reasons: string[];
  source: TriageSource;
  aiProvider: string;
  summary?: string;
}

/** One patient check-in joined with its triage result (an "alert"). */
export interface CheckIn extends SymptomReport {
  structured?: { key: string; severity: string; onset: string; flag?: boolean }[];
  hasPhoto?: boolean;
  redFlags?: string[];
  reply?: string;
  id: string;
  patientId: string;
  patientName: string;
  createdAt: string;
  status: AlertStatus;
  triage: TriageResult;
}
