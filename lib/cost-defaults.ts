import type { CalculatorInput } from "@/lib/calculator";
import type { Currency, SizeBand } from "@/types";

/**
 * Representative business inputs for an org of a given size band, used to seed
 * the audit-adjusted cost loop and the PDF when the owner has not entered their
 * own figures. Deliberately conservative; replacementCost + productivityLoss are
 * left to the cited research defaults. The dashboard lets the owner override.
 */
const EMPLOYEES_BY_BAND: Record<SizeBand, number> = {
  "1-9": 5,
  "10-49": 25,
  "50-199": 100,
  "200-999": 500,
  "1000+": 1500,
};

const DEFAULT_SALARY: Record<Currency, number> = {
  GBP: 45000,
  INR: 900000,
};

const DEFAULT_MANAGER_HOURLY: Record<Currency, number> = {
  GBP: 60,
  INR: 1200,
};

export function representativeBaseInputs(
  sizeBand: SizeBand | null,
  currency: Currency = "GBP",
): CalculatorInput {
  return {
    employees: sizeBand ? EMPLOYEES_BY_BAND[sizeBand] : 100,
    avgSalary: DEFAULT_SALARY[currency],
    sickDaysPerEmployee: 5,
    highStressPct: 35,
    turnoverRatePct: 15,
    managerHoursOnPeoplePerMonth: 30,
    managerHourlyCost: DEFAULT_MANAGER_HOURLY[currency],
    workMode: "hybrid",
    hasWellbeingProgram: false,
    recentTurmoil: false,
    currency,
    // replacementCostPerEmployee + productivityLossPct → cited research defaults
  };
}
