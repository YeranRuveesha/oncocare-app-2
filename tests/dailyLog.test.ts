import { describe, expect, it } from "vitest";
import { concerning, cToF, dailyLogSchema, fToC, logDot } from "@/lib/validation/dailyLog";

const ok = { temperature_c: 36.8, heart_rate: 70, bp_systolic: 120, bp_diastolic: 80, pain: 1, fatigue: 2, appetite: "Good", nausea: "None", vomiting_episodes: 0, loose_stools: 0, bleeding: false, mouth_brushing: 3, mouth_flossed: true, mouth_rinses: 4, lip_care: true, emollient_times: 2, sun_protection: "Yes", walking_minutes: 10, medicines: "Yes" };

describe("daily log schema", () => {
  it("accepts a normal log", () => expect(dailyLogSchema.safeParse(ok).success).toBe(true));
  it("rejects values outside the ranges", () => {
    for (const bad of [{ temperature_c: 33.9 }, { temperature_c: 42.1 }, { heart_rate: 29 }, { heart_rate: 221 }, { bp_systolic: 59 }, { bp_diastolic: 161 }, { spo2: 69 }, { weight_kg: 9 }, { pain: 11 }])
      expect(dailyLogSchema.safeParse({ ...ok, ...bad }).success).toBe(false);
  });
  it("needs systolic above diastolic", () => expect(dailyLogSchema.safeParse({ ...ok, bp_systolic: 80, bp_diastolic: 80 }).success).toBe(false));
  it("limits notes to 500 characters", () => expect(dailyLogSchema.safeParse({ ...ok, notes: "x".repeat(501) }).success).toBe(false));
  it("converts Fahrenheit", () => { expect(fToC(100.4)).toBe(38); expect(cToF(37)).toBe(98.6); });
  it("flags fever without diagnosing", () => {
    expect(concerning({ temperature_c: 38.0 })).toMatch(/38/);
    expect(concerning({ temperature_c: 37.9 })).toBeNull();
    expect(logDot({ temperature_c: 38.5, bleeding: false, spo2: null, pain: 0, medicines: "Yes" })).toBe("red");
  });
});
