import { describe, expect, it } from "vitest";
import { FACTORS, FACTORS_BY_ID } from "@/content/factors";
import { QUESTIONS, QUESTIONS_BY_ID } from "@/content/questions";
import { DIMENSIONS } from "@/lib/constants";
import {
  FACTORS_BY_DIMENSION,
  factorRiskLevel,
  factorScore,
  factorScores,
  isOutcomeFactor,
} from "@/lib/factors";
import { normaliseAnswer } from "@/lib/scoring";
import type { SurveyResponse } from "@/types";

const sortNum = (a: number, b: number) => a - b;

describe("factor ontology mapping", () => {
  it("covers every one of the 25 questions exactly once (no orphans, no dupes)", () => {
    const ids = FACTORS.flatMap((f) => f.questionIds).sort(sortNum);
    expect(ids).toEqual([...new Set(ids)]); // no duplicates
    expect(ids).toEqual(QUESTIONS.map((q) => q.id).sort(sortNum)); // full coverage
  });

  it("references only known question ids", () => {
    for (const f of FACTORS)
      for (const id of f.questionIds)
        expect(QUESTIONS_BY_ID.has(id)).toBe(true);
  });

  it("each factor's fiveC equals the dimension of every question it holds", () => {
    for (const f of FACTORS)
      for (const id of f.questionIds)
        expect(f.fiveC).toBe(QUESTIONS_BY_ID.get(id)!.dimension);
  });

  it("has unique factor ids", () => {
    expect(FACTORS_BY_ID.size).toBe(FACTORS.length);
  });

  it("tags exactly exhaustion(3), belonging(20) and future(25) as outcomes", () => {
    const outcomeQuestions = FACTORS.filter(isOutcomeFactor)
      .flatMap((f) => f.questionIds)
      .sort(sortNum);
    expect(outcomeQuestions).toEqual([3, 20, 25]);
  });

  it("nests every Core factor under a 5C dimension (never fiveC='outcome')", () => {
    const grouped = DIMENSIONS.flatMap((d) => FACTORS_BY_DIMENSION[d]);
    expect(grouped.length).toBe(FACTORS.length);
  });
});

describe("factor scoring", () => {
  const one = (answers: SurveyResponse["answers"]): SurveyResponse[] => [
    { segment: null, answers },
  ];

  it("reproduces reverse-aware normalisation (100 = healthiest)", () => {
    const exhaustion = FACTORS_BY_ID.get("capacity-exhaustion")!; // Q3, reverse
    // Strong agreement with "I often feel exhausted" is the worst → 0.
    expect(factorScore(one({ 3: 5 }), exhaustion)).toBe(0);
    expect(factorScore(one({ 3: 1 }), exhaustion)).toBe(100);

    const workload = FACTORS_BY_ID.get("capacity-workload")!; // Q1,Q2 forward
    expect(factorScore(one({ 1: 5, 2: 3 }), workload)).toBe(75); // (100+50)/2
    expect(factorScore(one({ 1: 5, 2: 3 }), workload)).toBe(
      Math.round((normaliseAnswer(5, false) + normaliseAnswer(3, false)) / 2),
    );
  });

  it("returns null when a factor has no data (never a fake 0)", () => {
    const workload = FACTORS_BY_ID.get("capacity-workload")!;
    expect(factorScore([], workload)).toBeNull();
    expect(factorScore(one({ 1: null, 2: null }), workload)).toBeNull();
    expect(factorScore(one({ 5: 4 }), workload)).toBeNull(); // unrelated q only
  });

  it("scores every factor (or null) for a response set", () => {
    const scores = factorScores(one({ 1: 4, 2: 4 }));
    expect(Object.keys(scores).length).toBe(FACTORS.length);
    expect(scores["capacity-workload"]).toBe(75); // both 4 → 75
    expect(scores["clarity-role"]).toBeNull(); // not answered
  });
});

describe("factorRiskLevel", () => {
  it("maps band boundaries to the right level", () => {
    expect(factorRiskLevel(100)).toBe("healthy");
    expect(factorRiskLevel(80)).toBe("healthy");
    expect(factorRiskLevel(79)).toBe("watch");
    expect(factorRiskLevel(60)).toBe("watch");
    expect(factorRiskLevel(59)).toBe("high");
    expect(factorRiskLevel(40)).toBe("high");
    expect(factorRiskLevel(39)).toBe("critical");
    expect(factorRiskLevel(0)).toBe("critical");
  });
});
