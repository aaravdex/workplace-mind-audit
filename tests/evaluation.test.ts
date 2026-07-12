import { describe, expect, it } from "vitest";
import {
  buildPulses,
  describeChange,
  fidelityScore,
  interpretFidelity,
  type FidelityRecord,
} from "@/lib/evaluation";
import { QUESTIONS_BY_ID } from "@/content/questions";

const ALL_TRUE: FidelityRecord = {
  started: true,
  deliveredToIntendedGroup: true,
  deliveredAsDesigned: true,
  managersTrained: true,
  processesUsed: true,
  resourcesProvided: true,
  leadershipConsistent: true,
  sustained: true,
};
const MOSTLY_FALSE: FidelityRecord = {
  ...ALL_TRUE,
  deliveredToIntendedGroup: false,
  deliveredAsDesigned: false,
  managersTrained: false,
  processesUsed: false,
  resourcesProvided: false,
  leadershipConsistent: false,
  sustained: false,
};

describe("fidelity", () => {
  it("scores fidelity as the share of checks met", () => {
    expect(fidelityScore(ALL_TRUE)).toBe(100);
    expect(fidelityScore(MOSTLY_FALSE)).toBe(13); // 1 of 8
  });

  it("reads low fidelity + no movement as an implementation gap, not a failed intervention", () => {
    expect(interpretFidelity(MOSTLY_FALSE, false)).toMatch(/implementation gap/i);
  });

  it("reads high fidelity + no movement as a reason to reconsider the intervention", () => {
    expect(interpretFidelity(ALL_TRUE, false)).toMatch(/reconsider/i);
  });

  it("reads movement as progress, and no record as unknown", () => {
    expect(interpretFidelity(ALL_TRUE, true)).toMatch(/showing movement/i);
    expect(interpretFidelity(null, false)).toMatch(/not been recorded/i);
  });
});

describe("change reporting", () => {
  it("reports change three ways, specifically", () => {
    const r = describeChange({
      factorLabel: "Priority clarity",
      before: 42,
      after: 53,
      practicallyMeaningful: true,
      embedded: false,
      driver: "clearer weekly priorities",
      unchanged: "after-hours work",
    });
    expect(r.statistical).toMatch(/42→53 \(\+11\)/);
    expect(r.practical).toMatch(/clearer weekly priorities/);
    expect(r.practical).toMatch(/after-hours work is unchanged/i);
    expect(r.implementation).toMatch(/fragile/i);
  });
});

describe("pulse generation", () => {
  it("produces implementation, factor, and reassessment pulses", () => {
    const pulses = buildPulses(["capacity-workload"]);
    expect(pulses.map((p) => p.name)).toEqual([
      "30-day implementation pulse",
      "60/90-day factor pulse",
      "6-month reassessment",
    ]);
    expect(pulses[0].questions.some((q) => /aware/i.test(q))).toBe(true);
    // The factor pulse re-asks only the targeted factor's items.
    expect(pulses[1].questions).toContain(QUESTIONS_BY_ID.get(1)!.text);
  });
});
