import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isValidNic, passwordSchema, normalizePhone } from "@/lib/validation/common";
import { generateTempPassword, generateUserCode, generateHospitalCode } from "@/lib/ids";

describe("password rules", () => {
  it("accepts a valid 16-character password", () => expect(passwordSchema.safeParse("Abcdefgh1234!xyZ").success).toBe(true));
  it("rejects short, missing classes and banned characters", () => {
    expect(passwordSchema.safeParse("Abc1!").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefgh1234!xyz").success).toBe(false);
    expect(passwordSchema.safeParse("Abcdefgh1234.xyZ").success).toBe(false);
    expect(passwordSchema.safeParse("Abcdefgh1234 xyZ").success).toBe(false);
  });
  it("temporary passwords always pass the rules", () => {
    for (let i = 0; i < 200; i++) expect(passwordSchema.safeParse(generateTempPassword()).success).toBe(true);
  });
});

describe("ids", () => {
  it("formats user codes", () => {
    expect(generateUserCode("patient")).toMatch(/^PAT-\d{8}$/);
    expect(generateUserCode("junior_doctor")).toMatch(/^CLN-\d{8}$/);
    expect(generateUserCode("hospital_admin")).toMatch(/^ADM-\d{8}$/);
    expect(generateUserCode("platform_admin")).toMatch(/^SUP-\d{8}$/);
    expect(generateHospitalCode()).toMatch(/^[A-Z2-9]{6}$/);
  });
});

describe("NIC and phone", () => {
  it("checks NIC formats", () => {
    expect(isValidNic("901234567V")).toBe(true);
    expect(isValidNic("199012345678")).toBe(true);
    expect(isValidNic("12345")).toBe(false);
    expect(isValidNic("909994567V")).toBe(false);
  });
  it("normalises phones to E.164", () => {
    expect(normalizePhone("+94 77 000 0001")).toBe("+94770000001");
    expect(normalizePhone("123")).toBeNull();
  });
});
