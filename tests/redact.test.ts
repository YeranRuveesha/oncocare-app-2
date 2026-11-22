import { describe, expect, it } from "vitest";
import { redactText } from "@/lib/triage/redact";

describe("redactText", () => {
  it("removes emails, phone numbers, NIC numbers and dates", () => {
    const out = redactText("Call me on +94 77 123 4567 or alex@example.com. NIC 199912345678, seen 12/11/2026");
    expect(out).not.toMatch(/alex@example\.com/);
    expect(out).not.toMatch(/4567/);
    expect(out).not.toMatch(/199912345678/);
    expect(out).not.toMatch(/12\/11\/2026/);
  });

  it("removes the patient's own name and self-introductions", () => {
    const out = redactText("My name is Alex Fernando and alex feels sick", ["Alex Fernando"]);
    expect(out.toLowerCase()).not.toContain("alex");
    expect(out.toLowerCase()).not.toContain("fernando");
  });

  it("keeps clinical content", () => {
    expect(redactText("Temperature 37.8 and loose stools since morning")).toContain("37.8");
  });

  it("limits length to 500 characters", () => {
    expect(redactText("a".repeat(2000)).length).toBeLessThanOrEqual(500);
  });
});
