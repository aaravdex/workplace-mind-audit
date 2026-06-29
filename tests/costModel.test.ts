import { describe, it, expect } from "vitest";
import { CalculatorInputSchema, computeBurnoutCost } from "@/lib/calculator";
import { ADJUSTMENT_CAP, auditAdjustedCost } from "@/lib/costModel";
import type { DimensionScores } from "@/types";

/**
 * Base scenario chosen so presenteeism (500k) and attrition (100k) are non-zero
 * and easy to reason about; absenteeism + manager overload are 0.
 */
const base = CalculatorInputSchema.parse({
  employees: 100,
  avgSalary: 50000,
  sickDaysPerEmployee: 0,
  highStressPct: 30,
  turnoverRatePct: 10,
  replacementCostPerEmployee: 10000,
  productivityLossPct: 10,
  managerHoursOnPeoplePerMonth: 0,
  managerHourlyCost: 0,
  workMode: "hybrid",
  hasWellbeingProgram: false,
  recentTurmoil: false,
});

const generic = computeBurnoutCost(base);

function scores(partial: Partial<DimensionScores>): DimensionScores {
  return {
    capacity: 85,
    clarity: 85,
    control: 85,
    connection: 85,
    confidence: 85,
    ...partial,
  };
}

describe("auditAdjustedCost — the loop", () => {
  it("leaves healthy scores essentially unchanged", () => {
    const r = auditAdjustedCost(base, scores({}));
    expect(r.adjustedTotal).toBe(generic.total);
    expect(r.delta).toBe(0);
    expect(r.drivers).toHaveLength(0);
    expect(r.capApplied).toBe(false);
  });

  it("raises the figure when scores are poor, naming the drivers", () => {
    const r = auditAdjustedCost(
      base,
      scores({ capacity: 20, clarity: 40, connection: 25, confidence: 30 }),
      { concentratedSegment: "Operations" },
    );
    expect(r.adjustedTotal).toBeGreaterThan(generic.total);
    expect(r.delta).toBeGreaterThan(0);
    expect(r.presenteeismUplift).toBeGreaterThan(0);
    expect(r.attritionUplift).toBeGreaterThan(0);
    const dims = r.drivers.map((d) => d.dimension).sort();
    expect(dims).toEqual(["capacity", "clarity", "confidence", "connection"]);
    expect(r.explanation.join(" ")).toContain("Operations");
  });

  it("never moves a line beyond the cap, even at rock-bottom scores", () => {
    const r = auditAdjustedCost(
      base,
      scores({ capacity: 0, clarity: 0, connection: 0, confidence: 0 }),
    );
    // Worst case → exactly the cap on both adjustable lines.
    expect(r.presenteeismUplift).toBeCloseTo(ADJUSTMENT_CAP, 10);
    expect(r.attritionUplift).toBeCloseTo(ADJUSTMENT_CAP, 10);
    expect(r.adjusted.presenteeism).toBeLessThanOrEqual(
      Math.round(r.generic.presenteeism * (1 + ADJUSTMENT_CAP)),
    );
    expect(r.adjusted.attrition).toBeLessThanOrEqual(
      Math.round(r.generic.attrition * (1 + ADJUSTMENT_CAP)),
    );
    expect(r.capApplied).toBe(true);
  });

  it("treats a null dimension as no-signal (never inflates on missing data)", () => {
    const r = auditAdjustedCost(
      base,
      scores({ capacity: null, clarity: 85, connection: 85, confidence: 85 }),
    );
    expect(r.presenteeismUplift).toBe(0);
    expect(r.adjustedTotal).toBe(generic.total);
  });

  it("leaves absenteeism and manager overload untouched", () => {
    const r = auditAdjustedCost(
      base,
      scores({ capacity: 10, connection: 10 }),
    );
    expect(r.adjusted.absenteeism).toBe(r.generic.absenteeism);
    expect(r.adjusted.managerOverload).toBe(r.generic.managerOverload);
  });
});
