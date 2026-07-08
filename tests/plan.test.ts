import { describe, expect, it } from "vitest";
import { buildInterventionPlan } from "@/lib/interventions/plan";
import { buildFindings } from "@/lib/interpretation";
import { evaluatePatterns } from "@/lib/patterns";
import { computeDataQuality } from "@/lib/dataQuality";
import { contextSignals } from "@/lib/context";
import { factorScores } from "@/lib/factors";
import { dimensionScores } from "@/lib/scoring";
import type { LikertValue, SurveyResponse } from "@/types";

const BURNOUT = { 1: 2, 2: 2, 3: 5, 4: 2, 5: 4, 16: 2 } as Record<number, LikertValue>;

function planFrom(answers: Record<number, LikertValue>, n = 20) {
  const resps: SurveyResponse[] = Array.from({ length: n }, () => ({ segment: null, answers }));
  const dq = computeDataQuality(resps);
  const signals = contextSignals(null);
  return buildInterventionPlan({
    findings: buildFindings({ responses: resps, dataQuality: dq, contextSignals: signals, reportingThreshold: 5 }),
    patterns: evaluatePatterns({
      factorScores: factorScores(resps),
      dimensionScores: dimensionScores(resps),
      contextSignals: signals,
      dataQuality: dq,
      segments: { reported: [], suppressed: [] },
    }),
    contextSignals: signals,
  });
}

describe("playbook generation", () => {
  const plan = planFrom(BURNOUT);

  it("generates playbooks for the primary responses", () => {
    expect(plan.playbooks.length).toBeGreaterThan(0);
  });

  it("every playbook is complete and executable", () => {
    for (const pb of plan.playbooks) {
      expect(pb.steps.length).toBeGreaterThan(0);
      expect(pb.ownership.accountable.length).toBeGreaterThan(0);
      expect(pb.leadingIndicators.length).toBeGreaterThan(0);
      expect(pb.laggingIndicators.length).toBeGreaterThan(0);
      expect(pb.reviewDecisionMenu).toHaveLength(5);
      for (const s of pb.steps) {
        expect(s.stepNumber).toBeGreaterThan(0);
        expect(s.owner.length).toBeGreaterThan(0);
        expect(s.deadline).toMatch(/week \d+/);
        expect(s.successMeasure.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("30-60-90 roadmap", () => {
  const plan = planFrom(BURNOUT);

  it("has the four phased windows and validation up front", () => {
    expect(plan.roadmap.map((w) => w.window)).toEqual([
      "Days 1–30 · Validate & stabilise",
      "Days 31–60 · Redesign, pilot & train",
      "Days 61–90 · Embed & re-measure",
      "Beyond 90 · Sustain & reassess",
    ]);
    const w1 = plan.roadmap[0].items.join(" ");
    expect(w1).toMatch(/communicate the aggregate findings/i);
    expect(w1).toMatch(/validation/i);
  });

  it("sequences a dependent intervention after its prerequisite across windows", () => {
    const ids = plan.items.map((i) => i.intervention.interventionId);
    if (ids.includes("manager-capability-training")) {
      const w1 = plan.roadmap[0].items.join(" ");
      const w2 = plan.roadmap[1].items.join(" ");
      expect(w1).toMatch(/Workload & priority redesign/i); // prerequisite, no deps
      expect(w2).toMatch(/Manager capability/i); // dependent
      expect(w1).not.toMatch(/Manager capability/i);
    }
  });
});
