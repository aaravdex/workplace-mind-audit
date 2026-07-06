import { describe, expect, it } from "vitest";
import {
  computeDataQuality,
  confidenceRating,
  contradictionCount,
  isStraightLining,
} from "@/lib/dataQuality";
import { segmentScores } from "@/lib/scoring";
import type { LikertValue, SurveyResponse } from "@/types";

const resp = (
  answers: SurveyResponse["answers"],
  segment: string | null = null,
): SurveyResponse => ({ segment, answers });

const allSame = (val: LikertValue, count = 12): SurveyResponse["answers"] => {
  const a: Record<number, LikertValue> = {};
  for (let i = 1; i <= count; i++) a[i] = val;
  return a;
};

describe("isStraightLining", () => {
  it("flags the same raw value across ≥10 answered items", () => {
    expect(isStraightLining(allSame(4, 12))).toBe(true);
  });
  it("does not flag fewer than 10 answered items", () => {
    expect(isStraightLining(allSame(4, 9))).toBe(false);
  });
  it("does not flag varied answers", () => {
    const varied: Record<number, LikertValue> = {};
    for (let i = 1; i <= 12; i++) varied[i] = ((i % 5) + 1) as LikertValue;
    expect(isStraightLining(varied)).toBe(false);
  });
});

describe("contradictionCount", () => {
  it("flags agreeing with both a statement and its opposite", () => {
    // control high (11=5) AND micromanaged high (14=5) → incompatible.
    expect(contradictionCount({ 11: 5, 14: 5 })).toBe(1);
  });
  it("does not flag a consistent pair", () => {
    // control high (11=5) AND micromanaged low (14=1) → consistent.
    expect(contradictionCount({ 11: 5, 14: 1 })).toBe(0);
  });
  it("ignores a pair when one item is missing", () => {
    expect(contradictionCount({ 11: 5 })).toBe(0);
  });
  it("counts multiple contradicting pairs", () => {
    expect(contradictionCount({ 6: 5, 9: 5, 8: 5, 10: 5 })).toBe(2);
  });
});

describe("confidenceRating", () => {
  const base = { responseRate: null, integrityFlagRate: 0 };
  it("is insufficient below the platform floor", () => {
    expect(confidenceRating({ ...base, responseCount: 4 }).level).toBe("insufficient");
  });
  it("scales with sample size", () => {
    expect(confidenceRating({ ...base, responseCount: 7 }).level).toBe("exploratory");
    expect(confidenceRating({ ...base, responseCount: 20 }).level).toBe("moderate");
    expect(confidenceRating({ ...base, responseCount: 40 }).level).toBe("high");
  });
  it("downgrades for a low response rate", () => {
    expect(
      confidenceRating({ responseCount: 40, responseRate: 20, integrityFlagRate: 0 }).level,
    ).toBe("moderate");
  });
  it("downgrades for a high rate of low-quality responses", () => {
    expect(
      confidenceRating({ responseCount: 40, responseRate: 70, integrityFlagRate: 0.5 }).level,
    ).toBe("moderate");
  });
  it("never drops below exploratory once ≥5 responses exist", () => {
    expect(
      confidenceRating({ responseCount: 7, responseRate: 10, integrityFlagRate: 0.9 }).level,
    ).toBe("exploratory");
  });
});

describe("computeDataQuality", () => {
  it("computes response rate only when a denominator is provided", () => {
    const ten = Array.from({ length: 10 }, () => resp({ 1: 4 }));
    expect(computeDataQuality(ten, { invitedCount: 20 }).responseRate).toBe(50);
    expect(computeDataQuality(ten, { invitedCount: 20 }).responseRateLabel).toBe("50%");
    const dq = computeDataQuality(ten);
    expect(dq.responseRate).toBeNull();
    expect(dq.responseRateLabel).toBe("denominator not provided");
    expect(dq.started).toBeNull();
  });

  it("measures item missingness", () => {
    const rs = [resp({ 1: 4 }), resp({ 1: 5 })]; // nobody answers Q2..Q25
    const dq = computeDataQuality(rs);
    const q1 = dq.itemMissingness.find((m) => m.questionId === 1)!;
    const q2 = dq.itemMissingness.find((m) => m.questionId === 2)!;
    expect(q1.missingPct).toBe(0);
    expect(q2.missingPct).toBe(100);
  });

  it("counts straight-lining and contradictions without persisting anything", () => {
    const rs = [
      resp(allSame(4, 12)), // straight-liner (no contradiction)
      resp({ 11: 5, 14: 5, 1: 2, 2: 3 }), // contradictor (not straight-lining)
      resp({ 1: 4, 2: 3, 3: 2 }), // clean
    ];
    const { integrity } = computeDataQuality(rs);
    expect(integrity.straightLining).toBe(1);
    expect(integrity.contradictions).toBe(1);
    expect(integrity.flaggedResponses).toBe(2);
  });

  it("reports segment participation shares", () => {
    const rs = [resp({ 1: 4 }, "A"), resp({ 1: 4 }, "A"), resp({ 1: 4 }, "B")];
    const dq = computeDataQuality(rs);
    expect(dq.participation[0]).toMatchObject({ segment: "A", responseCount: 2 });
  });

  it("clamps the reporting threshold to the platform floor", () => {
    const rs = [resp({ 1: 4 })];
    expect(computeDataQuality(rs, { reportingThreshold: 3 }).reportingThreshold).toBe(5);
    expect(computeDataQuality(rs, { reportingThreshold: 12 }).reportingThreshold).toBe(12);
  });
});

describe("segmentScores — configurable reporting threshold", () => {
  const rs = [
    ...Array.from({ length: 7 }, () => resp({ 1: 4 }, "A")),
    ...Array.from({ length: 5 }, () => resp({ 1: 4 }, "B")),
  ];

  it("defaults to the platform floor of 5 (backward-compatible)", () => {
    const { reported, suppressed } = segmentScores(rs);
    expect(reported.map((r) => r.segment).sort()).toEqual(["A", "B"]);
    expect(suppressed).toHaveLength(0);
  });

  it("hides segments below a higher reporting threshold", () => {
    const { reported, suppressed } = segmentScores(rs, 10);
    expect(reported).toHaveLength(0);
    expect(suppressed.map((s) => s.segment).sort()).toEqual(["A", "B"]);
  });

  it("never drops below the floor even if asked to", () => {
    const { reported } = segmentScores(rs, 3); // clamps to 5
    expect(reported.map((r) => r.segment).sort()).toEqual(["A", "B"]);
  });
});
