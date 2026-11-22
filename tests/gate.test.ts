import { describe, expect, it } from "vitest";
import { gate, type GateInput } from "@/lib/gate";

const ok: GateInput = {
  role: "patient", status: "active", mustChangePassword: false, emailVerified: true,
  phoneVerified: true, hasVerifiedTotp: true, aal: "aal2", hospitalStatus: "active",
};

describe("gate", () => {
  it("lets a fully verified active user in", () => expect(gate(ok)).toBe("ok"));
  it("blocks deactivated users and hospitals first", () => {
    expect(gate({ ...ok, status: "deactivated" })).toBe("blocked");
    expect(gate({ ...ok, hospitalStatus: "deactivated", emailVerified: false })).toBe("blocked");
  });
  it("sends unverified users to onboarding", () => {
    expect(gate({ ...ok, emailVerified: false })).toBe("onboarding");
    expect(gate({ ...ok, phoneVerified: false })).toBe("onboarding");
    expect(gate({ ...ok, hasVerifiedTotp: false })).toBe("onboarding");
    expect(gate({ ...ok, mustChangePassword: true })).toBe("onboarding");
  });
  it("needs the authenticator code every login", () => expect(gate({ ...ok, aal: "aal1" })).toBe("mfa"));
  it("holds pending clinicians after the authenticator", () => {
    expect(gate({ ...ok, role: "junior_doctor", status: "pending_approval" })).toBe("waiting");
    expect(gate({ ...ok, role: "junior_doctor", status: "pending_approval", aal: "aal1" })).toBe("mfa");
  });
});
