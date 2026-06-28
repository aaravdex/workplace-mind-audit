import { describe, it, expect } from "vitest";
import {
  CalculatorInputSchema,
  computeBurnoutCost,
  type CalculatorInput,
} from "@/lib/calculator";
import { formatCurrency } from "@/lib/utils";
import { RUN_AUDIT_CTA } from "@/lib/constants";

/**
 * Reference scenario with deliberately round numbers:
 *   dailySalary   = 52000 / 260            = 200
 *   absenteeism   = 100 * 5 * 200          = 100,000
 *   presenteeism  = 100 * 52000 * 0.10     = 520,000
 *   attrition     = 100 * 0.15 * 10000     = 150,000
 *   managerOverld = 40 * 50 * 12           = 24,000
 *   total                                  = 794,000
 *   payroll       = 100 * 52000            = 5,200,000  (→ 15.3% of payroll)
 */
const baseInput: CalculatorInput = CalculatorInputSchema.parse({
  employees: 100,
  avgSalary: 52000,
  sickDaysPerEmployee: 5,
  highStressPct: 45,
  turnoverRatePct: 15,
  replacementCostPerEmployee: 10000,
  productivityLossPct: 10,
  managerHoursOnPeoplePerMonth: 40,
  managerHourlyCost: 50,
  workMode: "hybrid",
  hasWellbeingProgram: false,
  recentTurmoil: false,
  // currency omitted → defaults to GBP
});

describe("computeBurnoutCost — formulas", () => {
  const r = computeBurnoutCost(baseInput);

  it("derives the daily salary from 260 working days", () => {
    expect(r.dailySalary).toBe(200);
  });

  it("computes each cost line", () => {
    expect(r.breakdown.absenteeism).toBe(100_000);
    expect(r.breakdown.presenteeism).toBe(520_000);
    expect(r.breakdown.attrition).toBe(150_000);
    expect(r.breakdown.managerOverload).toBe(24_000);
  });

  it("sums the total and expresses it as a % of payroll", () => {
    expect(r.total).toBe(794_000);
    expect(r.payroll).toBe(5_200_000);
    expect(r.totalAsPctOfPayroll).toBe(15.3);
  });

  it("defaults the currency to GBP and always recommends the audit", () => {
    expect(r.currency).toBe("GBP");
    expect(r.recommendedNextStep).toBe(RUN_AUDIT_CTA);
    expect(r.isEstimate).toBe(true);
  });
});

describe("computeBurnoutCost — top drivers", () => {
  const r = computeBurnoutCost(baseInput);

  it("returns the three largest lines, ordered, dropping the smallest", () => {
    expect(r.topDrivers).toHaveLength(3);
    expect(r.topDrivers.map((d) => d.key)).toEqual([
      "presenteeism",
      "attrition",
      "absenteeism",
    ]);
    // managerOverload (the smallest) is excluded.
    expect(r.topDrivers.map((d) => d.key)).not.toContain("managerOverload");
  });

  it("computes each driver's share of total and a formatted amount", () => {
    const presenteeism = r.topDrivers[0];
    expect(presenteeism.shareOfTotalPct).toBe(65.5); // 520000 / 794000
    expect(presenteeism.formatted).toContain("£");
    expect(presenteeism.formatted).toContain("520,000");
  });

  it("excludes zero-value lines", () => {
    const noManagerCost = computeBurnoutCost(
      CalculatorInputSchema.parse({
        ...baseInput,
        managerHoursOnPeoplePerMonth: 0,
      }),
    );
    expect(noManagerCost.topDrivers.map((d) => d.key)).not.toContain(
      "managerOverload",
    );
  });
});

describe("computeBurnoutCost — risk level", () => {
  it("classifies the reference scenario as High", () => {
    // cost 15.3% → High band; stress 45% → High band.
    expect(computeBurnoutCost(baseInput).riskLevel).toBe("High");
  });

  it("steps down one band when a wellbeing programme exists", () => {
    const r = computeBurnoutCost(
      CalculatorInputSchema.parse({ ...baseInput, hasWellbeingProgram: true }),
    );
    expect(r.riskLevel).toBe("Moderate");
  });

  it("steps up one band after recent turmoil", () => {
    const r = computeBurnoutCost(
      CalculatorInputSchema.parse({ ...baseInput, recentTurmoil: true }),
    );
    expect(r.riskLevel).toBe("Critical");
  });

  it("offsetting modifiers cancel out", () => {
    const r = computeBurnoutCost(
      CalculatorInputSchema.parse({
        ...baseInput,
        recentTurmoil: true,
        hasWellbeingProgram: true,
      }),
    );
    expect(r.riskLevel).toBe("High");
  });

  it("lets a high-stress signal drive risk even when costs are low", () => {
    const r = computeBurnoutCost(
      CalculatorInputSchema.parse({
        employees: 10,
        avgSalary: 30000,
        sickDaysPerEmployee: 0,
        highStressPct: 70, // → Critical band
        turnoverRatePct: 0,
        replacementCostPerEmployee: 0,
        productivityLossPct: 0,
        managerHoursOnPeoplePerMonth: 0,
        managerHourlyCost: 0,
        workMode: "remote",
        hasWellbeingProgram: false,
        recentTurmoil: false,
      }),
    );
    expect(r.total).toBe(0);
    expect(r.riskLevel).toBe("Critical");
  });
});

describe("CalculatorInputSchema — validation boundary", () => {
  it("rejects out-of-range percentages", () => {
    expect(() =>
      CalculatorInputSchema.parse({ ...baseInput, productivityLossPct: 150 }),
    ).toThrow();
  });

  it("rejects a non-positive headcount", () => {
    expect(() =>
      CalculatorInputSchema.parse({ ...baseInput, employees: 0 }),
    ).toThrow();
  });

  it("rejects negative money", () => {
    expect(() =>
      CalculatorInputSchema.parse({ ...baseInput, avgSalary: -1 }),
    ).toThrow();
  });

  it("accepts and preserves an explicit currency", () => {
    const parsed = CalculatorInputSchema.parse({ ...baseInput, currency: "INR" });
    expect(parsed.currency).toBe("INR");
  });
});

describe("formatCurrency", () => {
  it("formats GBP in pounds", () => {
    expect(formatCurrency(1000, "GBP")).toContain("£");
    expect(formatCurrency(1000, "GBP")).toContain("1,000");
  });

  it("formats INR in rupees (lakh grouping)", () => {
    const out = formatCurrency(100000, "INR");
    expect(out).toContain("₹");
    expect(out).toContain("1,00,000");
  });
});
