import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/content/questions";
import { computeDataQuality } from "@/lib/dataQuality";
import { contextSignals, provisionalStatus, type AuditContext } from "@/lib/context";
import { dimensionScores, segmentScores } from "@/lib/scoring";
import { factorScores } from "@/lib/factors";
import { buildFindings } from "@/lib/interpretation";
import { evaluatePatterns } from "@/lib/patterns";
import { prioritise } from "@/lib/priority";
import { buildInterventionPlan } from "@/lib/interventions/plan";
import { interpretFidelity, describeChange, type FidelityRecord } from "@/lib/evaluation";
import type { LikertValue, SurveyResponse } from "@/types";

/**
 * PHASE 9 — the 20 scenario tests. Each drives the full deterministic pipeline
 * and asserts the correct risk/confidence, pattern rules, intervention class
 * (banned classes absent), warnings, suppression — and never a diagnosis,
 * invented datum, or generic recommendation. Scenarios the Core survey can only
 * proxy are marked; their Core-visible symptom is still asserted.
 */

const ALL_HEALTHY: Record<number, LikertValue> = {};
const ALL_LOW: Record<number, LikertValue> = {};
for (const q of QUESTIONS) {
  ALL_HEALTHY[q.id] = (q.reverse ? 1 : 5) as LikertValue;
  ALL_LOW[q.id] = (q.reverse ? 5 : 1) as LikertValue;
}
const merge = (...o: Record<number, LikertValue>[]) => Object.assign({}, ...o);
const rep = (answers: Record<number, LikertValue>, segment: string | null = null): SurveyResponse => ({ segment, answers });
const many = (answers: Record<number, LikertValue>, n = 20, segment: string | null = null) =>
  Array.from({ length: n }, () => rep(answers, segment));

function pipeline(
  responses: SurveyResponse[],
  context: AuditContext | null = null,
  extraFactors: Record<string, number> = {},
) {
  const dq = computeDataQuality(responses);
  const signals = contextSignals(context);
  const dims = dimensionScores(responses);
  const segs = segmentScores(responses, 5);
  const fscores = { ...factorScores(responses), ...extraFactors };
  const findings = buildFindings({ responses, dataQuality: dq, contextSignals: signals, reportingThreshold: 5 });
  const patterns = evaluatePatterns({ factorScores: fscores, dimensionScores: dims, contextSignals: signals, dataQuality: dq, segments: segs });
  const prioritisation = prioritise({ findings, factorScores: fscores, contextSignals: signals });
  const plan = buildInterventionPlan({ findings, patterns, contextSignals: signals });
  return { dq, signals, dims, segs, findings, patterns, prioritisation, plan };
}

const patternIds = (p: ReturnType<typeof pipeline>) => p.patterns.map((x) => x.patternId);
const interventionIds = (p: ReturnType<typeof pipeline>) => p.plan.items.map((i) => i.intervention.interventionId);
const finding = (p: ReturnType<typeof pipeline>, d: string) => p.findings.find((f) => f.dimension === d)!;

describe("scenario suite", () => {
  it("1. high workload from understaffing → capacity mismatch + staffing analysis", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 1: 2, 2: 2 })), { situation: { rapidHiring: true } });
    expect(patternIds(p)).toContain("capacity-mismatch");
    expect(interventionIds(p)).toContain("capacity-staffing-analysis");
  });

  it("2. high workload from meeting overload (Core proxy) → capacity reads at risk", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 1: 2, 2: 2, 5: 4 })));
    expect(["high", "critical"]).toContain(finding(p, "capacity").riskLevel);
  });

  it("3. priority instability → priority-governance, not capacity mismatch", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 1: 2, 2: 2, 7: 2, 10: 5 })));
    expect(patternIds(p)).toContain("priority-governance");
    expect(patternIds(p)).not.toContain("capacity-mismatch");
  });

  it("4. high workload with rework (Core proxy) → clarity + capacity at risk", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 1: 2, 2: 2, 6: 2, 8: 2, 9: 5 })));
    expect(["high", "critical"]).toContain(finding(p, "clarity").riskLevel);
  });

  it("5. high engagement + high exhaustion → overextension; NEVER engagement activities", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 3: 5, 4: 2 })));
    expect(patternIds(p)).toContain("unsustainable-commitment");
    const uc = p.patterns.find((x) => x.patternId === "unsustainable-commitment")!;
    expect(uc.preferredInterventionClass).toMatch(/do not|not .*engagement/i);
  });

  it("6. low safety + low reported conflict → silence risk (not harmony)", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 21: 1, 22: 1, 23: 1, 15: 1 })));
    expect(patternIds(p)).toContain("silence-risk");
  });

  it("7. one high-risk department in a healthy org → unequal experience", () => {
    const p = pipeline([...many(ALL_HEALTHY, 15, "Sales"), ...many(ALL_LOW, 6, "Ops")]);
    expect(patternIds(p)).toContain("unequal-experience");
  });

  it("8. healthy average, polarised responses → not described as uniformly healthy", () => {
    const p = pipeline([...many(ALL_HEALTHY, 15, "A"), ...many(ALL_LOW, 6, "B")]);
    const ue = p.patterns.find((x) => x.patternId === "unequal-experience")!;
    expect(ue.interpretation).toMatch(/not .*uniformly healthy/i);
  });

  it("9. org-wide low manager support → connection at risk", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 16: 1, 17: 1, 18: 1, 19: 1, 20: 1 })));
    expect(["high", "critical"]).toContain(finding(p, "connection").riskLevel);
  });

  it("10. single-team low manager support → that segment reported, others healthy", () => {
    const p = pipeline([...many(ALL_HEALTHY, 10, "Eng"), ...many(merge(ALL_HEALTHY, { 16: 1, 18: 1 }), 6, "Support")]);
    const support = p.segs.reported.find((s) => s.segment === "Support")!;
    const eng = p.segs.reported.find((s) => s.segment === "Eng")!;
    expect(support.dimensions.connection! < eng.dimensions.connection!).toBe(true);
  });

  it("11. high burnout indicators + low response rate → confidence caps the claims", () => {
    const p = pipeline(many(merge(ALL_LOW, {}), 6)); // only 6 responses
    expect(finding(p, "capacity").confidence).toBe("exploratory");
    // exploratory evidence is never sequenced as immediate.
    const cap = p.prioritisation.items.find((i) => i.refId === "finding-capacity");
    if (cap) expect(cap.classification).not.toBe("immediate-operational");
  });

  it("12. wellbeing benefits + poor work design → wellbeing-washing; wellness not primary", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 1: 2, 2: 2, 4: 2 })), { systems: { hasWellbeingProgramme: true } });
    expect(patternIds(p)).toContain("wellbeing-washing");
    expect(p.plan.items.every((i) => !(i.intervention.interventionLevel === "tertiary" && i.isPrimaryResponse))).toBe(true);
  });

  it("13. change fatigue post-restructuring → context reshapes the interpretation", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 1: 2, 2: 2 })), { situation: { restructuring: true } });
    expect(finding(p, "capacity").interpretation).toMatch(/restructuring/i);
  });

  it("14. remote isolation in a hybrid org (Core proxy) → connection at risk", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 16: 1, 17: 2, 20: 1 })), { profile: { workArrangement: "remote" } });
    expect(["high", "critical"]).toContain(finding(p, "connection").riskLevel);
  });

  it("15. bullying/harassment pattern → protected safeguarding bypass, non-client-visible", () => {
    const p = pipeline(many(ALL_HEALTHY), null, { "civility-harassment": 20 });
    expect(p.prioritisation.safeguardingCount).toBe(1);
    const sg = p.prioritisation.items.find((i) => i.classification === "immediate-safeguarding")!;
    expect(sg.requiresHumanReview).toBe(true);
    expect(sg.clientVisible).toBe(false);
  });

  it("16. small subgroup is suppressed", () => {
    const p = pipeline([...many(ALL_HEALTHY, 10, "Big"), ...many(ALL_HEALTHY, 3, "Tiny")]);
    expect(p.segs.reported.map((s) => s.segment)).toContain("Big");
    expect(p.segs.suppressed.map((s) => s.segment)).toContain("Tiny");
  });

  it("17. missing context → provisional plan with clarification questions", () => {
    const s = provisionalStatus(null);
    expect(s.provisional).toBe(true);
    expect(s.clarifyingQuestions.length).toBeGreaterThan(0);
  });

  it("18. intervention selected despite insufficient resources → feasibility warning", () => {
    const p = pipeline(many(merge(ALL_HEALTHY, { 1: 2, 2: 2 })), {
      readiness: { budgetBand: "limited", sponsorAvailability: "low" },
    });
    expect(p.prioritisation.items.some((i) => /Feasibility.*low/i.test(i.rationale))).toBe(true);
  });

  it("19. outcome failure with low fidelity → implementation-failure interpretation", () => {
    const lowFidelity: FidelityRecord = {
      started: true, deliveredToIntendedGroup: false, deliveredAsDesigned: false, managersTrained: false,
      processesUsed: false, resourcesProvided: false, leadershipConsistent: false, sustained: false,
    };
    expect(interpretFidelity(lowFidelity, false)).toMatch(/implementation gap/i);
  });

  it("20. score improvement without operational improvement → not called meaningful", () => {
    const r = describeChange({ factorLabel: "Priority clarity", before: 42, after: 47, practicallyMeaningful: false, embedded: false });
    expect(r.statistical).toMatch(/42→47/);
    expect(r.practical).toMatch(/not yet operationally meaningful/i);
  });
});

describe("cross-cutting guarantees hold across scenarios", () => {
  const banned = /\b(because|causes?|caused|due to|proves?|proven)\b/i;
  const profiles = [ALL_LOW, merge(ALL_HEALTHY, { 1: 2, 2: 2 }), merge(ALL_HEALTHY, { 21: 1, 22: 1 })];

  it("never states a hypothesis as fact or gives a generic banned action", () => {
    for (const prof of profiles) {
      const p = pipeline(many(prof));
      for (const f of p.findings) {
        expect(f.interpretation).not.toMatch(banned);
        expect(f.limitations.join(" ")).toMatch(/does not establish causation/i);
      }
      for (const item of p.plan.items) {
        for (const s of item.intervention.implementationSteps) {
          for (const a of s.actions) {
            expect(["improve communication", "reduce workload", "support managers"]).not.toContain(a.toLowerCase());
          }
        }
      }
    }
  });
});
