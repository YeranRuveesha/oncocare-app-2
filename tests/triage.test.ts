import { describe, expect, it, vi } from "vitest";

// Force the mock provider so tests never call a real AI service.
vi.mock("@/lib/config", () => ({
  config: { aiProvider: "mock", aiModel: "", geminiApiKey: "", openaiApiKey: "" },
  isDemoMode: () => true,
}));

import { runTriage } from "@/lib/triage/triageService";
import * as ai from "@/lib/triage/ai";

describe("runTriage", () => {
  it("no red flags and mild symptoms is routine", async () => {
    const r = await runTriage({ temperatureC: 36.8, symptoms: ["fatigue"] });
    expect(r.tier).toBe("routine");
    expect(r.source).toBe("mock_ai");
  });

  it("a red flag always produces at least its tier, with rules as the source", async () => {
    const r = await runTriage({ temperatureC: 38.5, symptoms: [] });
    expect(r.tier).toBe("emergency");
    expect(r.source).toBe("red_flag_rules");
    expect(r.urgencyScore).toBeGreaterThanOrEqual(80);
  });

  it("the AI can never lower a red-flag tier", async () => {
    const spy = vi.spyOn(ai, "classifyWithAi").mockResolvedValue({
      tier: "routine",
      urgencyScore: 5,
      categories: [],
      summary: "Looks fine",
      provider: "gemini",
    });
    const r = await runTriage({ symptoms: ["rigors"] });
    expect(r.tier).toBe("emergency");
    expect(r.urgencyScore).toBeGreaterThanOrEqual(80);
    spy.mockRestore();
  });

  it("the AI may raise a tier when no red flag matched", async () => {
    const spy = vi.spyOn(ai, "classifyWithAi").mockResolvedValue({
      tier: "urgent",
      urgencyScore: 65,
      categories: ["respiratory"],
      summary: "Worsening cough",
      provider: "gemini",
    });
    const r = await runTriage({ symptoms: ["cough"], notes: "much worse today" });
    expect(r.tier).toBe("urgent");
    expect(r.source).toBe("ai_assist");
    spy.mockRestore();
  });

  it("free-text notes are redacted before reaching the AI", async () => {
    const spy = vi.spyOn(ai, "classifyWithAi");
    await runTriage({ symptoms: [], notes: "I'm Alex, email alex@example.com" }, ["Alex Fernando"]);
    const sent = JSON.stringify(spy.mock.calls[0][0]);
    expect(sent).not.toMatch(/alex/i);
    spy.mockRestore();
  });
});
