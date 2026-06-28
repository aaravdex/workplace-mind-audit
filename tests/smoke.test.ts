import { describe, it, expect } from "vitest";
import {
  MIN_RESPONSES_PER_SEGMENT,
  DISCLAIMER,
  DIMENSIONS,
  RISK_BAND_THRESHOLDS,
} from "@/lib/constants";

/**
 * Phase 0 smoke tests. These guard the foundational invariants the whole
 * product depends on, so a careless edit to constants fails CI immediately.
 * The real scoring/calculator suites land in Phase 1.
 */
describe("foundational constants", () => {
  it("enforces the anonymity threshold at 5", () => {
    // Lowering this would risk de-anonymising small teams. Change deliberately.
    expect(MIN_RESPONSES_PER_SEGMENT).toBe(5);
  });

  it("ships the non-diagnostic disclaimer verbatim", () => {
    expect(DISCLAIMER).toContain("not a medical, psychiatric, or diagnostic");
    expect(DISCLAIMER).toContain("does not diagnose mental health conditions");
  });

  it("defines exactly the five Cs in canonical order", () => {
    expect(DIMENSIONS).toEqual([
      "capacity",
      "clarity",
      "control",
      "connection",
      "confidence",
    ]);
  });

  it("covers the full 0–100 range with contiguous risk bands", () => {
    const sorted = [...RISK_BAND_THRESHOLDS].sort((a, b) => a.min - b.min);
    expect(sorted[0].min).toBe(0);
    expect(sorted[sorted.length - 1].max).toBe(100);
    // No gaps between bands.
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].min).toBe(sorted[i - 1].max + 1);
    }
  });
});
