import { describe, it, expect } from "vitest";
import {
  QUESTIONS,
  QUESTIONS_BY_DIMENSION,
  getQuestion,
} from "@/content/questions";
import { DIMENSIONS } from "@/lib/constants";

describe("question bank integrity", () => {
  it("has exactly 25 questions", () => {
    expect(QUESTIONS).toHaveLength(25);
  });

  it("uses unique, contiguous ids 1–25", () => {
    const ids = QUESTIONS.map((q) => q.id).sort((a, b) => a - b);
    expect(new Set(ids).size).toBe(25);
    expect(ids[0]).toBe(1);
    expect(ids[24]).toBe(25);
  });

  it("maps exactly 5 questions to each of the five Cs", () => {
    for (const dimension of DIMENSIONS) {
      expect(QUESTIONS_BY_DIMENSION[dimension]).toHaveLength(5);
    }
  });

  it("marks exactly the documented items as reverse-scored", () => {
    const reverseIds = QUESTIONS.filter((q) => q.reverse)
      .map((q) => q.id)
      .sort((a, b) => a - b);
    expect(reverseIds).toEqual([3, 5, 9, 10, 14]);
  });

  it("looks up a question by id", () => {
    expect(getQuestion(3)?.dimension).toBe("capacity");
    expect(getQuestion(3)?.reverse).toBe(true);
    expect(getQuestion(999)).toBeUndefined();
  });
});
