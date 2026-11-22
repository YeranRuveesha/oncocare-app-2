import { describe, expect, it } from "vitest";
import { evaluateReportRules, type ReportedSymptom } from "@/config/triage-rules";
import { reportSchema } from "@/lib/validation/report";

const sym = (key: string, severity: ReportedSymptom["severity"] = "mild", onset: ReportedSymptom["onset"] = "today", flag?: boolean): ReportedSymptom => ({ key, severity, onset, flag });

describe("report rules", () => {
  it("fever of 38.0 is an emergency", () => expect(evaluateReportRules([sym("fatigue_x")], 38.0).tier).toBe("emergency"));
  it("trouble breathing is an emergency even when mild", () => expect(evaluateReportRules([sym("breathing")]).tier).toBe("emergency"));
  it("bloody diarrhoea is an emergency, plain mild diarrhoea is routine", () => {
    expect(evaluateReportRules([sym("diarrhoea", "mild", "today", true)]).tier).toBe("emergency");
    expect(evaluateReportRules([sym("diarrhoea")]).tier).toBe("routine");
  });
  it("new rash is urgent", () => expect(evaluateReportRules([sym("rash")]).tier).toBe("urgent"));
  it("severe bleeding is an emergency, mild bleeding urgent", () => {
    expect(evaluateReportRules([sym("bleeding", "severe")]).tier).toBe("emergency");
    expect(evaluateReportRules([sym("bleeding")]).tier).toBe("urgent");
  });
  it("highest tier wins", () => expect(evaluateReportRules([sym("rash"), sym("cannot_eat_drink")]).tier).toBe("emergency"));
  it("mild other symptoms are routine", () => expect(evaluateReportRules([sym("other")], 36.8).tier).toBe("routine"));
});

describe("report schema", () => {
  it("needs at least one symptom", () => expect(reportSchema.safeParse({ symptoms: [] }).success).toBe(false));
  it("needs text for 'other'", () => expect(reportSchema.safeParse({ symptoms: [{ key: "other", severity: "mild", onset: "today" }] }).success).toBe(false));
  it("rejects absurd temperature", () => expect(reportSchema.safeParse({ symptoms: [{ key: "cough", severity: "mild", onset: "today" }], temperatureC: 50 }).success).toBe(false));
});
