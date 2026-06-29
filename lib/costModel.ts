import type {
  CostBreakdown,
  Currency,
  Dimension,
  DimensionScores,
} from "@/types";
import {
  computeBurnoutCost,
  type CalculatorInput,
} from "@/lib/calculator";

/**
 * THE LOOP. Re-derives the financial figure from an audit's ACTUAL 5C scores,
 * replacing generic assumptions with values modulated by real risk:
 *   - low Capacity (+ low Clarity execution drag) → higher modelled presenteeism
 *   - low Connection + low Confidence            → higher modelled attrition
 *
 * DEFENSIBILITY DISCIPLINE: every adjustment is bounded. No cost line may move
 * by more than ADJUSTMENT_CAP, so the loop is a measured response to data, not a
 * machine for manufacturing scary numbers. Healthy scores leave the figure
 * essentially unchanged; the cap is asserted in tests and can never be exceeded.
 */
export const ADJUSTMENT_CAP = 0.4; // ±40% maximum movement on any adjusted line

const PRESENTEEISM_FLOOR = 60; // scores at/above this contribute no uplift
const ATTRITION_FLOOR = 60;

export interface CostAdjustmentDriver {
  dimension: Dimension;
  label: string;
  effect: "presenteeism" | "attrition";
}

export interface AdjustedCostBreakdown {
  currency: Currency;
  genericTotal: number;
  adjustedTotal: number;
  /** adjustedTotal − genericTotal (can be 0 for healthy orgs). */
  delta: number;
  generic: CostBreakdown;
  adjusted: CostBreakdown;
  /** Fractional uplift actually applied to each adjustable line (0…CAP). */
  presenteeismUplift: number;
  attritionUplift: number;
  drivers: CostAdjustmentDriver[];
  explanation: string[];
  concentratedSegment: string | null;
  /** True when an adjustment reached the cap (i.e. the model bounded it). */
  capApplied: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** How far a dimension sits below its floor, as a 0…1 fraction. Null ⇒ 0. */
function gap(score: number | null, floor: number): number {
  if (score === null) return 0;
  return clamp((floor - score) / floor, 0, 1);
}

const DIM_LABEL: Record<Dimension, string> = {
  capacity: "Capacity",
  clarity: "Clarity",
  control: "Control",
  connection: "Connection",
  confidence: "Confidence",
};

export function auditAdjustedCost(
  baseInputs: CalculatorInput,
  scores: DimensionScores,
  options: { concentratedSegment?: string | null } = {},
): AdjustedCostBreakdown {
  const generic = computeBurnoutCost(baseInputs);
  const g = generic.breakdown;

  const capacityGap = gap(scores.capacity, PRESENTEEISM_FLOOR);
  const clarityGap = gap(scores.clarity, PRESENTEEISM_FLOOR);
  const connectionGap = gap(scores.connection, ATTRITION_FLOOR);
  const confidenceGap = gap(scores.confidence, ATTRITION_FLOOR);

  // Weighted gaps × cap. By construction each uplift is in [0, ADJUSTMENT_CAP],
  // so no line can ever move beyond the documented bound.
  const presenteeismUplift =
    ADJUSTMENT_CAP * (0.7 * capacityGap + 0.3 * clarityGap);
  const attritionUplift =
    ADJUSTMENT_CAP * (0.5 * connectionGap + 0.5 * confidenceGap);

  const adjusted: CostBreakdown = {
    absenteeism: g.absenteeism,
    presenteeism: Math.round(g.presenteeism * (1 + presenteeismUplift)),
    attrition: Math.round(g.attrition * (1 + attritionUplift)),
    managerOverload: g.managerOverload,
  };

  const adjustedTotal =
    adjusted.absenteeism +
    adjusted.presenteeism +
    adjusted.attrition +
    adjusted.managerOverload;

  const drivers: CostAdjustmentDriver[] = [];
  if (capacityGap > 0)
    drivers.push({ dimension: "capacity", label: DIM_LABEL.capacity, effect: "presenteeism" });
  if (clarityGap > 0)
    drivers.push({ dimension: "clarity", label: DIM_LABEL.clarity, effect: "presenteeism" });
  if (connectionGap > 0)
    drivers.push({ dimension: "connection", label: DIM_LABEL.connection, effect: "attrition" });
  if (confidenceGap > 0)
    drivers.push({ dimension: "confidence", label: DIM_LABEL.confidence, effect: "attrition" });

  const concentratedSegment = options.concentratedSegment ?? null;

  const explanation: string[] = [];
  if (drivers.length === 0) {
    explanation.push(
      "Your 5C scores are healthy, so the audit-adjusted figure is essentially unchanged from the generic estimate.",
    );
  } else {
    const presenteeismDrivers = drivers
      .filter((d) => d.effect === "presenteeism")
      .map((d) => d.label);
    const attritionDrivers = drivers
      .filter((d) => d.effect === "attrition")
      .map((d) => d.label);
    if (presenteeismDrivers.length > 0) {
      explanation.push(
        `Low ${presenteeismDrivers.join(" and ")} raises modelled presenteeism (people present but under-performing).`,
      );
    }
    if (attritionDrivers.length > 0) {
      explanation.push(
        `Low ${attritionDrivers.join(" and ")} raises modelled attrition risk (people leave unsupported, unsafe cultures).`,
      );
    }
    if (concentratedSegment) {
      explanation.push(`Risk is most concentrated in ${concentratedSegment}.`);
    }
  }

  const capEpsilon = 1e-9;
  const capApplied =
    presenteeismUplift >= ADJUSTMENT_CAP - capEpsilon ||
    attritionUplift >= ADJUSTMENT_CAP - capEpsilon;

  return {
    currency: generic.currency,
    genericTotal: generic.total,
    adjustedTotal,
    delta: adjustedTotal - generic.total,
    generic: g,
    adjusted,
    presenteeismUplift,
    attritionUplift,
    drivers,
    explanation,
    concentratedSegment,
    capApplied,
  };
}
