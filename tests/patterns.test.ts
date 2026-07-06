import { describe, expect, it } from "vitest";
import { evaluatePatterns, type PatternInput } from "@/lib/patterns";
import { FACTORS } from "@/content/factors";
import { computeDataQuality } from "@/lib/dataQuality";
import { contextSignals, type AuditContext } from "@/lib/context";
import type {
  DimensionScores,
  SegmentScoreSummary,
  SegmentScoresResult,
  SurveyResponse,
} from "@/types";

const ALL_HEALTHY: Record<string, number> = Object.fromEntries(
  FACTORS.map((f) => [f.id, 80]),
);
const DIMS_HEALTHY: DimensionScores = {
  capacity: 80,
  clarity: 80,
  control: 80,
  connection: 80,
  confidence: 80,
};

function mkInput(
  over: Record<string, number>,
  o: {
    context?: AuditContext | null;
    segments?: SegmentScoresResult;
    dims?: DimensionScores;
    n?: number;
  } = {},
): PatternInput {
  const dummy: SurveyResponse[] = Array.from({ length: o.n ?? 20 }, () => ({
    segment: null,
    answers: {},
  }));
  return {
    factorScores: { ...ALL_HEALTHY, ...over },
    dimensionScores: o.dims ?? DIMS_HEALTHY,
    contextSignals: contextSignals(o.context ?? null),
    dataQuality: computeDataQuality(dummy),
    segments: o.segments ?? { reported: [], suppressed: [] },
  };
}

const has = (input: PatternInput, id: string) =>
  evaluatePatterns(input).some((p) => p.patternId === id);

describe("pattern rules fire on their signature — and not otherwise", () => {
  it("all-healthy input fires nothing", () => {
    expect(evaluatePatterns(mkInput({}))).toHaveLength(0);
  });

  it("demand–control", () => {
    expect(has(mkInput({ "capacity-workload": 30, "control-autonomy": 30 }), "demand-control")).toBe(true);
  });

  it("burnout pathway", () => {
    const p = mkInput({
      "capacity-workload": 30,
      "capacity-recovery": 30,
      "connection-manager-support": 30,
      "capacity-exhaustion": 30,
    });
    expect(has(p, "burnout-pathway")).toBe(true);
  });

  it("silence risk (low safety + low voice + high civility)", () => {
    const p = mkInput({
      "confidence-psych-safety": 30,
      "connection-civility": 85,
      "control-decision-involvement": 30,
    });
    expect(has(p, "silence-risk")).toBe(true);
  });

  it("manager bottleneck", () => {
    expect(has(mkInput({ "clarity-role": 30, "connection-manager-support": 30 }), "manager-bottleneck")).toBe(true);
  });

  it("priority governance (workload high + priorities low) — not capacity mismatch", () => {
    const p = mkInput({ "capacity-workload": 30, "clarity-priorities": 30 });
    expect(has(p, "priority-governance")).toBe(true);
    expect(has(p, "capacity-mismatch")).toBe(false);
  });

  it("capacity mismatch needs context (workload high + priorities OK + growth)", () => {
    const withCtx = mkInput(
      { "capacity-workload": 30, "clarity-priorities": 75 },
      { context: { situation: { rapidHiring: true } } },
    );
    expect(has(withCtx, "capacity-mismatch")).toBe(true);
    // without the context signal it does NOT fire spuriously
    const noCtx = mkInput({ "capacity-workload": 30, "clarity-priorities": 75 });
    expect(has(noCtx, "capacity-mismatch")).toBe(false);
  });

  it("wellbeing-washing needs the wellbeing-programme context flag", () => {
    const p = mkInput(
      { "capacity-workload": 30, "capacity-recovery": 30 },
      { context: { systems: { hasWellbeingProgramme: true } } },
    );
    expect(has(p, "wellbeing-washing")).toBe(true);
    expect(has(mkInput({ "capacity-workload": 30, "capacity-recovery": 30 }), "wellbeing-washing")).toBe(false);
  });

  it("unequal experience (healthy average, one team far below)", () => {
    const seg: SegmentScoreSummary = {
      segment: "Operations",
      dimensions: { capacity: 45, clarity: 45, control: 45, connection: 45, confidence: 45 },
      overall: 45,
      band: "Risk",
      responseCount: 6,
    };
    const p = mkInput({}, { segments: { reported: [seg], suppressed: [] } });
    expect(has(p, "unequal-experience")).toBe(true);
  });
});

describe("unsustainable commitment never prescribes engagement activities", () => {
  it("fires on high commitment + high exhaustion + low recovery, targeting load not morale", () => {
    const p = mkInput({
      "connection-belonging": 85,
      "capacity-exhaustion": 30,
      "capacity-recovery": 30,
    });
    const uc = evaluatePatterns(p).find((x) => x.patternId === "unsustainable-commitment");
    expect(uc).toBeTruthy();
    expect(uc!.preferredInterventionClass).toMatch(/do not|not .*engagement/i);
    expect(uc!.preferredInterventionClass).toMatch(/recovery|load/i);
    expect(uc!.proxyNote).toBeTruthy();
  });
});

describe("outcomes are signals, never the prescribed target", () => {
  it("burnout pathway targets work-design drivers, not exhaustion", () => {
    const p = mkInput({
      "capacity-workload": 30,
      "capacity-recovery": 30,
      "connection-manager-support": 30,
      "capacity-exhaustion": 30,
    });
    const bp = evaluatePatterns(p).find((x) => x.patternId === "burnout-pathway")!;
    expect(bp.preferredInterventionClass).toMatch(/work-design|workload|recovery/i);
    expect(bp.preferredInterventionClass).toMatch(/not the symptom|outcome/i);
  });
});

describe("language compliance across every fired pattern", () => {
  const banned = /\b(because|causes?|caused|due to|proves?|proven|results? in)\b/i;
  const inputs = [
    mkInput({ "capacity-workload": 30, "control-autonomy": 30 }),
    mkInput({ "capacity-workload": 25, "capacity-recovery": 25, "connection-manager-support": 25, "capacity-exhaustion": 25 }),
    mkInput({ "confidence-psych-safety": 30, "connection-civility": 85, "control-decision-involvement": 30 }),
    mkInput({ "capacity-workload": 30, "clarity-priorities": 30 }),
  ];
  it("no interpretation claims causation; every hypothesis is hedged with alternatives", () => {
    for (const input of inputs) {
      for (const f of evaluatePatterns(input)) {
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
      }
    }
  });
});
