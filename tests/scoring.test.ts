import { describe, it, expect } from "vitest";
import type {
  DimensionScores,
  LikertAnswer,
  Question,
  SurveyResponse,
} from "@/types";
import { QUESTIONS } from "@/content/questions";
import {
  combinedInsights,
  dimensionScore,
  normaliseAnswer,
  overallScore,
  riskBand,
  segmentScores,
  summarise,
} from "@/lib/scoring";

/** Build a full response by choosing an answer per question. */
function buildResponse(
  valueFor: (q: Question) => LikertAnswer,
  segment: string | null = null,
): SurveyResponse {
  const answers: Record<number, LikertAnswer> = {};
  for (const q of QUESTIONS) answers[q.id] = valueFor(q);
  return { segment, answers };
}

// A respondent in the healthiest possible state (accounting for reverse items).
const best = buildResponse((q) => (q.reverse ? 1 : 5));
// The worst possible state.
const worst = buildResponse((q) => (q.reverse ? 5 : 1));
// Dead-centre on every item.
const neutral = buildResponse(() => 3);

const allScores = (value: number): DimensionScores => ({
  capacity: value,
  clarity: value,
  control: value,
  connection: value,
  confidence: value,
});

describe("normaliseAnswer", () => {
  it("scores forward items 1→0 … 5→100", () => {
    expect(normaliseAnswer(1, false)).toBe(0);
    expect(normaliseAnswer(3, false)).toBe(50);
    expect(normaliseAnswer(5, false)).toBe(100);
  });

  it("reverse-scores so agreeing with a negative item is worst", () => {
    expect(normaliseAnswer(5, true)).toBe(0);
    expect(normaliseAnswer(3, true)).toBe(50);
    expect(normaliseAnswer(1, true)).toBe(100);
  });
});

describe("dimensionScore", () => {
  it("returns 100 for an all-best respondent (reverse items handled)", () => {
    expect(dimensionScore([best], "capacity")).toBe(100);
  });

  it("returns 0 for an all-worst respondent", () => {
    expect(dimensionScore([worst], "capacity")).toBe(0);
  });

  it("averages across responses", () => {
    expect(dimensionScore([best, worst], "capacity")).toBe(50);
  });

  it("ignores null and unanswered questions, not counting them as zero", () => {
    // Answer only capacity q1 (forward, 5→100) and q3 (reverse, 1→100); the
    // rest are null/absent. A null-as-zero bug would drag this below 100.
    const partial: SurveyResponse = {
      segment: null,
      answers: { 1: 5, 2: null, 3: 1 },
    };
    expect(dimensionScore([partial], "capacity")).toBe(100);
  });

  it("returns null when a dimension has no data at all", () => {
    const empty: SurveyResponse = { segment: null, answers: {} };
    expect(dimensionScore([empty], "capacity")).toBeNull();
  });
});

describe("overallScore", () => {
  it("is the mean of the five dimension scores", () => {
    expect(overallScore([best])).toBe(100);
    expect(overallScore([worst])).toBe(0);
    expect(overallScore([neutral])).toBe(50);
    expect(overallScore([best, worst])).toBe(50);
  });

  it("returns null with no usable answers", () => {
    expect(overallScore([{ segment: null, answers: {} }])).toBeNull();
  });
});

describe("riskBand", () => {
  it("classifies at the documented thresholds", () => {
    expect(riskBand(100)).toBe("Healthy");
    expect(riskBand(80)).toBe("Healthy");
    expect(riskBand(79)).toBe("Watch");
    expect(riskBand(60)).toBe("Watch");
    expect(riskBand(59)).toBe("Risk");
    expect(riskBand(40)).toBe("Risk");
    expect(riskBand(39)).toBe("Critical");
    expect(riskBand(0)).toBe("Critical");
  });
});

describe("summarise", () => {
  it("bundles dimensions, overall, band and count", () => {
    const summary = summarise([best, best]);
    expect(summary.responseCount).toBe(2);
    expect(summary.overall).toBe(100);
    expect(summary.band).toBe("Healthy");
    expect(summary.dimensions.connection).toBe(100);
  });
});

describe("combinedInsights", () => {
  it("flags high burnout risk when Capacity and Connection are both low", () => {
    const insights = combinedInsights({
      capacity: 40,
      clarity: 70,
      control: 70,
      connection: 50,
      confidence: 70,
    });
    expect(insights.map((i) => i.title)).toEqual(["High burnout risk"]);
    expect(insights[0].severity).toBe("critical");
  });

  it("flags silence risk when Confidence and Connection are both low", () => {
    const insights = combinedInsights({
      capacity: 70,
      clarity: 70,
      control: 70,
      connection: 50,
      confidence: 40,
    });
    expect(insights.map((i) => i.title)).toEqual([
      "Low innovation / silence risk",
    ]);
  });

  it("flags execution-delay risk when Clarity and Capacity are both low", () => {
    const insights = combinedInsights({
      capacity: 50,
      clarity: 40,
      control: 70,
      connection: 70,
      confidence: 70,
    });
    expect(insights.map((i) => i.title)).toEqual(["Execution-delay risk"]);
  });

  it("can fire multiple rules at once", () => {
    expect(combinedInsights(allScores(40))).toHaveLength(3);
  });

  it("fires nothing for a healthy organisation", () => {
    expect(combinedInsights(allScores(80))).toHaveLength(0);
  });

  it("never fires on null dimensions (no data ≠ low score)", () => {
    const noData: DimensionScores = {
      capacity: null,
      clarity: null,
      control: null,
      connection: null,
      confidence: null,
    };
    expect(combinedInsights(noData)).toHaveLength(0);
  });
});

describe("segmentScores — anonymity guardrail", () => {
  it("reports segments at/above the threshold and suppresses those below", () => {
    const responses = [
      ...Array.from({ length: 5 }, () => buildResponse((q) => (q.reverse ? 1 : 5), "Engineering")),
      ...Array.from({ length: 3 }, () => buildResponse((q) => (q.reverse ? 1 : 5), "Design")),
    ];

    const { reported, suppressed } = segmentScores(responses);

    expect(reported).toHaveLength(1);
    expect(reported[0].segment).toBe("Engineering");
    expect(reported[0].responseCount).toBe(5);
    expect(reported[0].overall).toBe(100);

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].segment).toBe("Design");
    expect(suppressed[0].responseCount).toBe(3);
    // The suppressed entry must NOT carry any scores.
    expect(suppressed[0]).not.toHaveProperty("dimensions");
    expect(suppressed[0]).not.toHaveProperty("overall");
  });

  it("treats exactly MIN_RESPONSES_PER_SEGMENT (5) as reportable", () => {
    const responses = Array.from({ length: 5 }, () =>
      buildResponse(() => 3, "Sales"),
    );
    const { reported, suppressed } = segmentScores(responses);
    expect(reported).toHaveLength(1);
    expect(suppressed).toHaveLength(0);
  });

  it("suppresses 4 responses (one below the threshold)", () => {
    const responses = Array.from({ length: 4 }, () =>
      buildResponse(() => 3, "Sales"),
    );
    const { reported, suppressed } = segmentScores(responses);
    expect(reported).toHaveLength(0);
    expect(suppressed[0].responseCount).toBe(4);
  });
});
