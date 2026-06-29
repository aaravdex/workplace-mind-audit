import { describe, it, expect } from "vitest";
import { CalculatorInputSchema, computeBurnoutCost } from "@/lib/calculator";

/**
 * When the user omits replacementCostPerEmployee or productivityLossPct, the
 * engine must fall back to a cited coefficient AND flag that it did so — never
 * silently invent a number.
 */
const partial = CalculatorInputSchema.parse({
  employees: 100,
  avgSalary: 50000,
  sickDaysPerEmployee: 0,
  highStressPct: 30,
  turnoverRatePct: 10,
  managerHoursOnPeoplePerMonth: 0,
  managerHourlyCost: 0,
  workMode: "hybrid",
  hasWellbeingProgram: false,
  recentTurmoil: false,
  // replacementCostPerEmployee + productivityLossPct omitted on purpose
});

describe("computeBurnoutCost — research-default fallbacks", () => {
  const r = computeBurnoutCost(partial);

  it("applies the 15% disengagement productivity-loss default", () => {
    // presenteeism = 100 * 50000 * 0.15
    expect(r.breakdown.presenteeism).toBe(750_000);
  });

  it("applies the 1× salary replacement-cost default", () => {
    // attrition = 100 * 0.10 * (50000 * 1.0)
    expect(r.breakdown.attrition).toBe(500_000);
  });

  it("flags both research defaults with their coefficient keys", () => {
    const keys = r.researchDefaults.map((d) => d.coefficientKey).sort();
    expect(keys).toEqual([
      "disengagement_productivity_loss",
      "replacement_cost_multiplier",
    ]);
    const productivity = r.researchDefaults.find(
      (d) => d.field === "productivityLossPct",
    );
    expect(productivity?.appliedValue).toBe(15);
  });

  it("records no research defaults when the user supplies both", () => {
    const full = CalculatorInputSchema.parse({
      ...partial,
      replacementCostPerEmployee: 8000,
      productivityLossPct: 12,
    });
    expect(computeBurnoutCost(full).researchDefaults).toHaveLength(0);
  });
});
