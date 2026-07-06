import { describe, expect, it } from "vitest";
import { prioritise } from "@/lib/priority";
import { buildFindings } from "@/lib/interpretation";
import { computeDataQuality } from "@/lib/dataQuality";
import { contextSignals } from "@/lib/context";
import { factorScores } from "@/lib/factors";
import type { LikertValue, SurveyResponse } from "@/types";

const responses = (
  answers: Record<number, LikertValue>,
  n = 20,
): SurveyResponse[] => Array.from({ length: n }, () => ({ segment: null, answers }));

function prio(
  answers: Record<number, LikertValue>,
  extraFactorScores: Record<string, number> = {},
) {
  const resps = responses(answers);
  const dq = computeDataQuality(resps);
  const findings = buildFindings({
    responses: resps,
    dataQuality: dq,
    contextSignals: contextSignals(null),
    reportingThreshold: 5,
  });
  return prioritise({
    findings,
    factorScores: { ...factorScores(resps), ...extraFactorScores },
    contextSignals: contextSignals(null),
  });
}

// Capacity critical; clarity healthy-ish (watch).
const CRIT = {
  1: 2, 2: 2, 3: 5, 4: 2, 5: 4,
  6: 4, 7: 4, 8: 4, 9: 2, 10: 2,
  11: 4, 12: 4, 13: 4, 14: 2, 15: 4,
  16: 4, 17: 4, 18: 4, 19: 4, 20: 4,
  21: 4, 22: 4, 23: 4, 24: 4, 25: 4,
} as Record<number, LikertValue>;

const HEALTHY = {
  1: 5, 2: 5, 3: 1, 4: 5, 5: 1,
  6: 5, 7: 5, 8: 5, 9: 1, 10: 1,
  11: 5, 12: 5, 13: 5, 14: 1, 15: 5,
  16: 5, 17: 5, 18: 5, 19: 5, 20: 5,
  21: 5, 22: 5, 23: 5, 24: 5, 25: 5,
} as Record<number, LikertValue>;

describe("priority classification & ordering", () => {
  it("a critical dimension is immediate-operational and ranks above lower risk", () => {
    const p = prio(CRIT);
    const cap = p.items.find((i) => i.refId === "finding-capacity")!;
    expect(cap.classification).toBe("immediate-operational");
    const idx = (id: string) => p.items.findIndex((i) => i.refId === id);
    expect(idx("finding-capacity")).toBeLessThan(idx("finding-clarity"));
  });

  it("a healthy dimension is only monitored", () => {
    const p = prio(HEALTHY);
    expect(p.items.find((i) => i.refId === "finding-capacity")!.classification).toBe("monitor");
  });

  it("exposure reflects how widespread the problem is", () => {
    const cap = prio(CRIT).items.find((i) => i.refId === "finding-capacity")!;
    expect(cap.components.exposure).toBeGreaterThan(0.5);
  });
});

describe("safeguarding bypass (mandatory)", () => {
  it("routes a protected-item signal to human review, non-client-visible and non-accusatory", () => {
    const p = prio(HEALTHY, { "civility-harassment": 20 });
    expect(p.safeguardingCount).toBe(1);
    const sg = p.items.find((i) => i.classification === "immediate-safeguarding")!;
    expect(sg.requiresHumanReview).toBe(true);
    expect(sg.clientVisible).toBe(false);
    expect(sg.rationale).not.toMatch(/\b(guilty|perpetrator|accused|blames?|culprit)\b/i);
    expect(p.items[0].classification).toBe("immediate-safeguarding"); // ranked first
  });

  it("does not fire on Core-only data (no protected items)", () => {
    expect(prio(CRIT).safeguardingCount).toBe(0);
  });
});

describe("explanation", () => {
  it("states that not everything should be tackled at once", () => {
    expect(prio(CRIT).summary).toMatch(/not everything should be tackled at once/i);
  });
});
