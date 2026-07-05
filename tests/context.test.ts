import { describe, expect, it } from "vitest";
import {
  ContextSchema,
  contextSignals,
  provisionalStatus,
  type ContextSignals,
} from "@/lib/context";

const NO_SIGNALS: ContextSignals = {
  seasonalPeak: false,
  postRestructuring: false,
  workforceContraction: false,
  rapidGrowth: false,
  rtoTransition: false,
  revenuePressure: false,
  wellbeingProgrammePresent: false,
  safetyCritical: false,
  changeSaturation: false,
  lowImplementationReadiness: false,
  activeDisruptions: [],
};

describe("ContextSchema", () => {
  it("accepts an empty context (every field optional)", () => {
    expect(ContextSchema.safeParse({}).success).toBe(true);
  });

  it("validates aggregated indicators are in range", () => {
    expect(
      ContextSchema.safeParse({ indicators: { voluntaryTurnoverPct: 15 } }).success,
    ).toBe(true);
    expect(
      ContextSchema.safeParse({ indicators: { voluntaryTurnoverPct: 150 } }).success,
    ).toBe(false);
  });

  it("enforces controlled enums", () => {
    expect(
      ContextSchema.safeParse({ profile: { workArrangement: "hybrid" } }).success,
    ).toBe(true);
    expect(
      ContextSchema.safeParse({ profile: { workArrangement: "banana" } }).success,
    ).toBe(false);
  });
});

describe("contextSignals", () => {
  it("returns all-false for empty/absent context", () => {
    expect(contextSignals(null)).toEqual(NO_SIGNALS);
    expect(contextSignals({})).toEqual(NO_SIGNALS);
  });

  it("makes DIFFERENT contexts produce DIFFERENT signals (context alters interpretation)", () => {
    const steady = contextSignals({ profile: { growthStage: "steady" } });
    const restructure = contextSignals({ situation: { restructuring: true } });
    const peak = contextSignals({ profile: { seasonality: { inPeakNow: true } } });

    expect(steady).toEqual(NO_SIGNALS); // steady state → no active signals
    expect(steady).not.toEqual(restructure);
    expect(steady).not.toEqual(peak);
    expect(restructure.postRestructuring).toBe(true);
    expect(peak.seasonalPeak).toBe(true);
  });

  it("derives growth, contraction, and RTO signals", () => {
    expect(contextSignals({ profile: { growthStage: "scaling" } }).rapidGrowth).toBe(true);
    expect(contextSignals({ situation: { rapidHiring: true } }).rapidGrowth).toBe(true);
    expect(
      contextSignals({ situation: { layoffsOrFreeze: true } }).workforceContraction,
    ).toBe(true);
    expect(
      contextSignals({ situation: { returnToOfficeChange: true } }).rtoTransition,
    ).toBe(true);
  });

  it("flags change saturation at 3+ active disruptions and lists them", () => {
    const many = contextSignals({
      situation: { restructuring: true, rapidHiring: true, revenuePressure: true },
    });
    expect(many.activeDisruptions).toHaveLength(3);
    expect(many.changeSaturation).toBe(true);
    expect(many.activeDisruptions).toContain("restructuring");
  });

  it("flags low implementation readiness only when budget AND capacity are constrained", () => {
    expect(
      contextSignals({ readiness: { budgetBand: "limited", hrCapacity: "low" } })
        .lowImplementationReadiness,
    ).toBe(true);
    expect(
      contextSignals({ readiness: { budgetBand: "moderate", hrCapacity: "low" } })
        .lowImplementationReadiness,
    ).toBe(false);
  });

  it("surfaces wellbeing-programme and safety-critical context", () => {
    expect(
      contextSignals({ systems: { hasWellbeingProgramme: true } })
        .wellbeingProgrammePresent,
    ).toBe(true);
    expect(contextSignals({ profile: { safetyCritical: true } }).safetyCritical).toBe(true);
  });
});

describe("provisionalStatus", () => {
  it("marks an empty context PROVISIONAL with paired assumptions + questions", () => {
    const s = provisionalStatus(null);
    expect(s.provisional).toBe(true);
    expect(s.assumptions.length).toBeGreaterThan(0);
    expect(s.clarifyingQuestions.length).toBe(s.assumptions.length);
  });

  it("is NOT provisional once all critical fields are present", () => {
    const s = provisionalStatus({
      profile: { headcount: 120, workArrangement: "hybrid", growthStage: "steady" },
      situation: { restructuring: false },
      readiness: { budgetBand: "moderate", sponsorAvailability: "high" },
    });
    expect(s.provisional).toBe(false);
    expect(s.assumptions).toEqual([]);
    expect(s.clarifyingQuestions).toEqual([]);
  });

  it("names the specific missing field in its clarifying question", () => {
    const s = provisionalStatus({
      profile: { workArrangement: "remote", growthStage: "scaling" },
      situation: { rapidHiring: true },
      readiness: { budgetBand: "limited", sponsorAvailability: "moderate" },
    });
    expect(s.provisional).toBe(true); // headcount still missing
    expect(s.clarifyingQuestions.some((q) => /headcount/i.test(q))).toBe(true);
  });
});
