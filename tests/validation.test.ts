import { describe, expect, it } from "vitest";
import { buildValidationGuides } from "@/lib/validation";
import { buildFindings } from "@/lib/interpretation";
import { evaluatePatterns } from "@/lib/patterns";
import { computeDataQuality } from "@/lib/dataQuality";
import { contextSignals } from "@/lib/context";
import { factorScores } from "@/lib/factors";
import { dimensionScores } from "@/lib/scoring";
import type { LikertValue, SurveyResponse } from "@/types";

const BURNOUT = { 1: 2, 2: 2, 3: 5, 4: 2, 5: 4, 16: 2 } as Record<number, LikertValue>;
const HEALTHY = {
  1: 5, 2: 5, 3: 1, 4: 5, 5: 1,
  6: 5, 7: 5, 8: 5, 9: 1, 10: 1,
} as Record<number, LikertValue>;

function guidesFrom(answers: Record<number, LikertValue>, n = 20) {
  const resps: SurveyResponse[] = Array.from({ length: n }, () => ({ segment: null, answers }));
  const dq = computeDataQuality(resps);
  const signals = contextSignals(null);
  const findings = buildFindings({ responses: resps, dataQuality: dq, contextSignals: signals, reportingThreshold: 5 });
  const patterns = evaluatePatterns({
    factorScores: factorScores(resps),
    dimensionScores: dimensionScores(resps),
    contextSignals: signals,
    dataQuality: dq,
    segments: { reported: [], suppressed: [] },
  });
  return buildValidationGuides({ findings, patterns });
}

describe("validation guides", () => {
  it("generates guides for priority findings with all four audiences", () => {
    const guides = guidesFrom(BURNOUT);
    const cap = guides.find((g) => g.refId === "finding-capacity")!;
    expect(cap).toBeTruthy();
    expect(cap.leadershipGuide.length).toBeGreaterThan(0);
    expect(cap.managerGuide.length).toBeGreaterThan(0);
    expect(cap.employeeGuide.length).toBeGreaterThan(0);
    expect(cap.operationalDataRequests.length).toBeGreaterThan(0);
    expect(cap.employeeGuide.some((q) => /volume|urgency|complexity/i.test(q))).toBe(true);
  });

  it("generates a guide per fired pattern using its validation questions", () => {
    const guides = guidesFrom(BURNOUT);
    const bp = guides.find((g) => g.refId === "burnout-pathway");
    expect(bp).toBeTruthy();
    expect(bp!.employeeGuide.length).toBeGreaterThan(0);
  });

  it("does not generate guides for healthy findings", () => {
    const guides = guidesFrom(HEALTHY);
    expect(guides.some((g) => g.refId === "finding-capacity")).toBe(false);
  });
});
