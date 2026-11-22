import { describe, expect, it } from "vitest";
import { checkRedFlags, clampToTier } from "@/lib/triage/redFlags";

describe("red-flag rules", () => {
  it("fever of 38.0°C or more is an emergency", () => {
    expect(checkRedFlags({ temperatureC: 38.0, symptoms: [] })?.tier).toBe("emergency");
    expect(checkRedFlags({ temperatureC: 38.2, symptoms: [] })?.tier).toBe("emergency");
  });

  it("37.9°C on its own is not a red flag", () => {
    expect(checkRedFlags({ temperatureC: 37.9, symptoms: [] })).toBeNull();
  });

  it.each(["rigors", "breathing_difficulty", "chest_pain", "confusion", "bleeding"])(
    "%s is an emergency",
    (symptom) => {
      expect(checkRedFlags({ symptoms: [symptom] })?.tier).toBe("emergency");
    },
  );

  it.each(["diarrhoea", "vomiting", "new_rash", "mouth_sores", "line_site_redness"])("%s alone is urgent", (symptom) => {
    expect(checkRedFlags({ symptoms: [symptom] })?.tier).toBe("urgent");
  });

  it("emergency wins over urgent when both are present", () => {
    const r = checkRedFlags({ temperatureC: 36.8, symptoms: ["diarrhoea", "rigors"] });
    expect(r?.tier).toBe("emergency");
    expect(r?.reasons.join(" ")).toMatch(/rigors/i);
  });

  it("lists every matching reason", () => {
    const r = checkRedFlags({ temperatureC: 38.6, symptoms: ["chest_pain", "bleeding"] });
    expect(r?.reasons).toHaveLength(3);
  });

  it("routine symptoms are not red flags", () => {
    expect(checkRedFlags({ temperatureC: 36.9, symptoms: ["fatigue", "poor_appetite"] })).toBeNull();
  });

  it("scores stay inside each tier's band", () => {
    const e = checkRedFlags({ temperatureC: 39, symptoms: ["rigors", "chest_pain", "bleeding", "confusion"] });
    expect(e!.urgencyScore).toBeGreaterThanOrEqual(80);
    expect(e!.urgencyScore).toBeLessThanOrEqual(100);
    const u = checkRedFlags({ symptoms: ["diarrhoea", "vomiting", "new_rash", "mouth_sores", "line_site_redness"] });
    expect(u!.urgencyScore).toBeGreaterThanOrEqual(50);
    expect(u!.urgencyScore).toBeLessThanOrEqual(79);
    expect(clampToTier(95, "routine")).toBe(49);
  });
});
