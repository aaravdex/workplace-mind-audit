import { describe, expect, it } from "vitest";
import { selectInterventions } from "@/lib/interventions/select";
import { buildFindings } from "@/lib/interpretation";
import { evaluatePatterns } from "@/lib/patterns";
import { computeDataQuality } from "@/lib/dataQuality";
import { contextSignals, type AuditContext } from "@/lib/context";
import { factorScores } from "@/lib/factors";
import { dimensionScores } from "@/lib/scoring";
import type { LikertValue, SurveyResponse } from "@/types";

function selectFrom(
  answers: Record<number, LikertValue>,
  ctx: AuditContext | null = null,
  n = 20,
) {
  const resps: SurveyResponse[] = Array.from({ length: n }, () => ({
    segment: null,
    answers,
  }));
  const dq = computeDataQuality(resps);
  const signals = contextSignals(ctx);
  const findings = buildFindings({
    responses: resps,
    dataQuality: dq,
    contextSignals: signals,
    reportingThreshold: 5,
  });
  const patterns = evaluatePatterns({
    factorScores: factorScores(resps),
    dimensionScores: dimensionScores(resps),
    contextSignals: signals,
    dataQuality: dq,
    segments: { reported: [], suppressed: [] },
  });
  return selectInterventions({ findings, patterns, contextSignals: signals });
}

// workload low, recovery low, manager-support low, exhaustion high → burnout pathway
const BURNOUT = { 1: 2, 2: 2, 3: 5, 4: 2, 5: 4, 16: 2 } as Record<number, LikertValue>;

describe("intervention selection", () => {
  const sel = selectFrom(BURNOUT);

  it("leads with a PRIMARY (change-the-work) intervention", () => {
    expect(
      sel.items.some((i) => i.isPrimaryResponse && i.intervention.interventionLevel === "primary"),
    ).toBe(true);
  });

  it("NEVER makes a tertiary (individual support) the primary response", () => {
    expect(
      sel.items.every(
        (i) => !(i.intervention.interventionLevel === "tertiary" && i.isPrimaryResponse),
      ),
    ).toBe(true);
    const eap = sel.items.find((i) => i.intervention.interventionId === "eap-adjustments-signposting");
    if (eap) expect(eap.isPrimaryResponse).toBe(false);
  });

  it("sequences a dependent intervention after its prerequisite", () => {
    const ids = sel.items.map((i) => i.intervention.interventionId);
    if (ids.includes("manager-capability-training")) {
      expect(ids.indexOf("workload-priority-redesign")).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf("workload-priority-redesign")).toBeLessThan(
        ids.indexOf("manager-capability-training"),
      );
      const mct = sel.items.find((i) => i.intervention.interventionId === "manager-capability-training")!;
      expect(mct.dependencyExplanation).toBeTruthy();
      expect(mct.sequenceAfter).toContain("workload-priority-redesign");
    }
  });

  it("every selected intervention explains why and what it addresses", () => {
    for (const i of sel.items) {
      expect(i.whyChosen.length).toBeGreaterThan(0);
      expect(i.addressesHypothesis.length).toBeGreaterThan(0);
      expect(i.triggeredBy.length).toBeGreaterThan(0);
    }
  });
});

describe("context tailoring", () => {
  it("flags work-design-must-lead when a wellbeing programme is already present", () => {
    const withWellbeing = selectFrom(BURNOUT, {
      systems: { hasWellbeingProgramme: true },
    });
    expect(
      withWellbeing.notes.some((nte) => /subordinate|work-design controls lead/i.test(nte)),
    ).toBe(true);
    // Without the context flag, that note is not raised.
    expect(selectFrom(BURNOUT).notes.some((nte) => /subordinate/i.test(nte))).toBe(false);
  });
});
