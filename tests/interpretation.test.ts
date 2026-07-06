import { describe, expect, it } from "vitest";
import { buildFindings } from "@/lib/interpretation";
import { computeDataQuality } from "@/lib/dataQuality";
import { contextSignals } from "@/lib/context";
import type { LikertValue, SurveyResponse } from "@/types";

const responses = (
  answers: Record<number, LikertValue>,
  n = 6,
): SurveyResponse[] => Array.from({ length: n }, () => ({ segment: null, answers }));

const findCap = (
  resps: SurveyResponse[],
  signals = contextSignals(null),
) => {
  const dq = computeDataQuality(resps);
  const findings = buildFindings({
    responses: resps,
    dataQuality: dq,
    contextSignals: signals,
    reportingThreshold: 5,
  });
  return findings.find((f) => f.dimension === "capacity")!;
};

// Capacity items: Q1,Q2 forward; Q3 reverse; Q4 forward; Q5 reverse.
const CRITICAL = { 1: 2, 2: 2, 3: 4, 4: 2, 5: 4 } as const; // → 25
const HIGH = { 1: 3, 2: 3, 3: 3, 4: 4, 5: 3 } as const; //     → 55
const HEALTHY = { 1: 5, 2: 5, 3: 1, 4: 5, 5: 1 } as const; //  → 100

describe("buildFinding — observation & risk level", () => {
  it("states the score plainly with its band", () => {
    const f = findCap(responses(CRITICAL));
    expect(f.riskLevel).toBe("critical");
    expect(f.observation).toMatch(/25\/100/);
    expect(f.observation).toMatch(/critical/);
  });
});

describe("score-conditional depth", () => {
  it("two different score profiles produce materially different findings", () => {
    const crit = findCap(responses(CRITICAL));
    const high = findCap(responses(HIGH));
    expect(crit.riskLevel).toBe("critical");
    expect(high.riskLevel).toBe("high");
    expect(crit.observation).not.toBe(high.observation);
    expect(crit.interpretation).not.toBe(high.interpretation);
  });
});

describe("language compliance (observation vs interpretation vs hypothesis)", () => {
  const banned = /\b(because|causes?|caused|due to|proves?|proven|results? in)\b/i;
  for (const [name, ans] of [
    ["critical", CRITICAL],
    ["high", HIGH],
    ["watch", { 1: 4, 2: 4, 3: 2, 4: 3, 5: 3 }],
  ] as const) {
    it(`never states a hypothesis as fact or claims causation (${name})`, () => {
      const f = findCap(responses(ans));
      expect(f.interpretation).toMatch(/consistent with/i);
      expect(f.interpretation).not.toMatch(banned);
      for (const h of f.rootCauseHypotheses) {
        expect(h).not.toMatch(banned);
        expect(h).toMatch(/plausible|may|could|should be validated/i);
      }
      if (f.rootCauseHypotheses.length > 0) {
        expect(f.alternativeExplanations.length).toBeGreaterThan(0);
      }
      expect(f.limitations.join(" ")).toMatch(/does not establish causation/i);
    });
  }
});

describe("strengths are described, not diagnosed", () => {
  it("a healthy dimension carries no root-cause hypotheses and favourable drivers", () => {
    const f = findCap(responses(HEALTHY));
    expect(f.riskLevel).toBe("healthy");
    expect(f.rootCauseHypotheses).toEqual([]);
    expect(f.alternativeExplanations).toEqual([]);
    expect(f.interpretation).toMatch(/strength/i);
    expect(f.evidence.itemDrivers.every((d) => d.direction === "favourable")).toBe(true);
  });
});

describe("insufficient data is reported, not interpreted", () => {
  it("caps a thin dimension at insufficient with no hypotheses", () => {
    const f = findCap(responses(CRITICAL, 3)); // only 3 responses
    expect(f.confidence).toBe("insufficient");
    expect(f.observation).toMatch(/not reliable|not answered/i);
    expect(f.rootCauseHypotheses).toEqual([]);
  });
});

describe("item-driver distribution math (reverse-aware)", () => {
  it("computes %favourable/%unfavourable per item", () => {
    const mixed = [
      ...responses(HEALTHY, 3), // Q1=5 → favourable
      ...responses({ 1: 1, 2: 1, 3: 5, 4: 1, 5: 5 }, 2), // Q1=1 → unfavourable
    ];
    const f = findCap(mixed);
    const q1 = f.evidence.responseDistributions.find((d) => d.questionId === 1)!;
    expect(q1.favourablePct).toBe(60);
    expect(q1.unfavourablePct).toBe(40);
  });
});

describe("context alters interpretation", () => {
  it("a rapid-growth context changes the narrative and hypothesis", () => {
    const plain = findCap(responses(CRITICAL));
    const growth = findCap(
      responses(CRITICAL),
      contextSignals({ situation: { rapidHiring: true } }),
    );
    expect(growth.interpretation).not.toBe(plain.interpretation);
    expect(growth.interpretation).toMatch(/growth/i);
    expect(growth.rootCauseHypotheses[0]).toMatch(/growth/i);
  });
});
