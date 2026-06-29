import { z } from "zod";
import type { CostBreakdown, CostDriver, Currency, RiskLevel } from "@/types";
import {
  COST_PCT_CUTOFFS,
  DEFAULT_CURRENCY,
  RISK_LEVELS,
  RUN_AUDIT_CTA,
  STRESS_PCT_CUTOFFS,
  WORKING_DAYS_PER_YEAR,
} from "@/lib/constants";
import {
  DISENGAGEMENT_PRODUCTIVITY_LOSS,
  REPLACEMENT_COST_MULTIPLIER_DEFAULT,
} from "@/lib/coefficients";
import { formatCurrency, round1, round2 } from "@/lib/utils";

/**
 * Calculator input schema — the single validation boundary. The API route and
 * the client form both parse against this. Percentages are 0–100; money/counts
 * are non-negative; `currency` defaults to GBP.
 *
 * `replacementCostPerEmployee` and `productivityLossPct` are OPTIONAL: when
 * omitted, the engine falls back to a cited coefficient and flags it in
 * `researchDefaults` so the UI can show the source rather than an invented number.
 */
export const CalculatorInputSchema = z.object({
  employees: z.number().int().positive(),
  avgSalary: z.number().positive(),
  sickDaysPerEmployee: z.number().min(0),
  highStressPct: z.number().min(0).max(100),
  turnoverRatePct: z.number().min(0).max(100),
  replacementCostPerEmployee: z.number().min(0).optional(),
  productivityLossPct: z.number().min(0).max(100).optional(),
  managerHoursOnPeoplePerMonth: z.number().min(0),
  managerHourlyCost: z.number().min(0),
  workMode: z.enum(["onsite", "hybrid", "remote"]),
  hasWellbeingProgram: z.boolean(),
  recentTurmoil: z.boolean(),
  currency: z.enum(["GBP", "INR"]).default(DEFAULT_CURRENCY),
});

/** Validated calculator input (after defaults applied). */
export type CalculatorInput = z.infer<typeof CalculatorInputSchema>;

/** Records that a research coefficient stood in for a missing user input. */
export interface ResearchDefault {
  field: "replacementCostPerEmployee" | "productivityLossPct";
  coefficientKey: string;
  label: string;
  appliedValue: number;
}

/** The full computed cost estimate. Every number is a directional estimate. */
export interface CalculatorResult {
  currency: Currency;
  /** Annual payroll = employees × avgSalary. */
  payroll: number;
  /** avgSalary ÷ 260 working days. */
  dailySalary: number;
  breakdown: CostBreakdown;
  /** Sum of the four cost lines. */
  total: number;
  /** Total as a percentage of payroll (1dp). */
  totalAsPctOfPayroll: number;
  riskLevel: RiskLevel;
  /** The 2–3 largest cost lines, human-readable. */
  topDrivers: CostDriver[];
  /** Which inputs were filled from a cited coefficient (empty when user-supplied). */
  researchDefaults: ResearchDefault[];
  recommendedNextStep: string;
  isEstimate: true;
  estimateNote: string;
}

const DRIVER_LABELS: Record<keyof CostBreakdown, string> = {
  presenteeism: "Presenteeism — reduced output while still at work",
  attrition: "Attrition — turnover and replacement cost",
  absenteeism: "Absenteeism — stress-related sick days",
  managerOverload: "Manager overload — leadership time spent on people issues",
};

/** Index of the band a value falls into (cutoffs are upper-exclusive). */
function bandIndex(value: number, cutoffs: readonly number[]): number {
  for (let i = 0; i < cutoffs.length; i++) {
    if (value < cutoffs[i]) return i;
  }
  return cutoffs.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the burnout-cost breakdown from validated inputs. Pure: no IO, fully
 * deterministic, unit-tested against known inputs.
 */
export function computeBurnoutCost(input: CalculatorInput): CalculatorResult {
  const {
    employees,
    avgSalary,
    sickDaysPerEmployee,
    turnoverRatePct,
    managerHoursOnPeoplePerMonth,
    managerHourlyCost,
    highStressPct,
    hasWellbeingProgram,
    recentTurmoil,
    currency,
  } = input;

  // Resolve the two optional inputs, falling back to cited coefficients.
  const researchDefaults: ResearchDefault[] = [];

  let productivityLossPct = input.productivityLossPct;
  if (productivityLossPct === undefined) {
    productivityLossPct = DISENGAGEMENT_PRODUCTIVITY_LOSS * 100;
    researchDefaults.push({
      field: "productivityLossPct",
      coefficientKey: "disengagement_productivity_loss",
      label: "Productivity loss (research default)",
      appliedValue: productivityLossPct,
    });
  }

  let replacementCostPerEmployee = input.replacementCostPerEmployee;
  if (replacementCostPerEmployee === undefined) {
    replacementCostPerEmployee = avgSalary * REPLACEMENT_COST_MULTIPLIER_DEFAULT;
    researchDefaults.push({
      field: "replacementCostPerEmployee",
      coefficientKey: "replacement_cost_multiplier",
      label: "Replacement cost (research default)",
      appliedValue: Math.round(replacementCostPerEmployee),
    });
  }

  const dailySalary = avgSalary / WORKING_DAYS_PER_YEAR;

  // Four cost lines (computed at full precision, rounded only for display).
  const absenteeism = employees * sickDaysPerEmployee * dailySalary;
  const presenteeism = employees * avgSalary * (productivityLossPct / 100);
  const attrition =
    employees * (turnoverRatePct / 100) * replacementCostPerEmployee;
  const managerOverload = managerHoursOnPeoplePerMonth * managerHourlyCost * 12;

  const breakdown: CostBreakdown = {
    absenteeism: Math.round(absenteeism),
    presenteeism: Math.round(presenteeism),
    attrition: Math.round(attrition),
    managerOverload: Math.round(managerOverload),
  };

  const totalRaw = absenteeism + presenteeism + attrition + managerOverload;
  const total = Math.round(totalRaw);
  const payroll = employees * avgSalary;
  const totalAsPctOfPayroll =
    payroll > 0 ? round1((totalRaw / payroll) * 100) : 0;

  // Risk level: take the worse of (cost-as-%-of-payroll) and (high-stress
  // signal), then aggravate for recent turmoil and mitigate for an existing
  // wellbeing programme. Transparent and deterministic.
  let level = Math.max(
    bandIndex(totalAsPctOfPayroll, COST_PCT_CUTOFFS),
    bandIndex(highStressPct, STRESS_PCT_CUTOFFS),
  );
  if (recentTurmoil) level += 1;
  if (hasWellbeingProgram) level -= 1;
  const riskLevel = RISK_LEVELS[clamp(level, 0, RISK_LEVELS.length - 1)];

  const topDrivers: CostDriver[] = (
    Object.keys(breakdown) as (keyof CostBreakdown)[]
  )
    .map((key) => ({ key, amount: breakdown[key] }))
    .filter((line) => line.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map(({ key, amount }) => ({
      key,
      label: DRIVER_LABELS[key],
      amount,
      shareOfTotalPct: total > 0 ? round1((amount / total) * 100) : 0,
      formatted: formatCurrency(amount, currency),
    }));

  return {
    currency,
    payroll: Math.round(payroll),
    dailySalary: round2(dailySalary),
    breakdown,
    total,
    totalAsPctOfPayroll,
    riskLevel,
    topDrivers,
    researchDefaults,
    recommendedNextStep: RUN_AUDIT_CTA,
    isEstimate: true,
    estimateNote:
      "Every figure here is a directional estimate based on your inputs and published research averages — not a precise audit.",
  };
}
