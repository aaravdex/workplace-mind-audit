import { WORKING_DAYS_PER_YEAR } from "@/lib/constants";

/**
 * Research-anchored cost coefficients. This file is what makes the money number
 * credible: every assumption is a named constant with a citable `source`, shown
 * to users in tooltips and on the public Methodology page.
 *
 * HONESTY RULES (enforced by convention + the `assumption` flag):
 *  - We use well-established public-domain RANGES, never invented study stats or
 *    fabricated DOIs.
 *  - Every figure is framed as a "modelled estimate", never a guarantee.
 *  - Anything without a credible public source is marked `assumption: true` so it
 *    can never masquerade as evidence in the UI.
 */

const MODELLED = "Modelled estimate based on published research, not a guarantee.";

export interface CoefficientSource {
  publication: string;
  year?: number;
  note: string;
}

export interface CoefficientDoc {
  key: string;
  name: string;
  /** Human-readable display value, e.g. "0.5×–2× salary (default 1×)". */
  value: string;
  source: CoefficientSource;
  disclaimer: string;
  /** true ⇒ no credible public source; surfaced in the UI as an assumption. */
  assumption: boolean;
}

// ── Computation values (imported by calculator.ts + costModel.ts) ─────────────

/** Replacing an employee commonly costs ~0.5×–2× their annual salary. */
export const REPLACEMENT_COST_SALARY_MULTIPLIER = {
  low: 0.5,
  mid: 1.0,
  high: 2.0,
} as const;

/** Default replacement multiplier when the user supplies no figure of their own. */
export const REPLACEMENT_COST_MULTIPLIER_DEFAULT =
  REPLACEMENT_COST_SALARY_MULTIPLIER.mid;

/** Modelled effective output loss in low-wellbeing/disengaged conditions (~15%). */
export const DISENGAGEMENT_PRODUCTIVITY_LOSS = 0.15;

/** Presenteeism is widely estimated to cost more than absenteeism (used to contextualise). */
export const PRESENTEEISM_TO_ABSENTEEISM_RATIO = 1.5;

/** Modelled additional sick days/year associated with high-stress conditions. */
export const STRESS_SICK_DAY_UPLIFT = 2;

// ── Display catalogue (Methodology page + calculator tooltips) ────────────────

export const COEFFICIENT_CATALOG: CoefficientDoc[] = [
  {
    key: "working_days_per_year",
    name: "Working days per year",
    value: `${WORKING_DAYS_PER_YEAR} days`,
    source: {
      publication: "Standard convention",
      note: "≈5 working days × 52 weeks minus typical leave; used to convert an annual salary into a daily rate.",
    },
    disclaimer: MODELLED,
    assumption: false,
  },
  {
    key: "replacement_cost_multiplier",
    name: "Replacement cost (× annual salary)",
    value: "0.5×–2× salary (default 1×)",
    source: {
      publication: "SHRM and industry estimates",
      note: "Replacing an employee commonly costs from about half to twice their annual salary, depending on seniority and role. The mid value (1×) is used unless you enter your own figure.",
    },
    disclaimer: MODELLED,
    assumption: false,
  },
  {
    key: "disengagement_productivity_loss",
    name: "Productivity loss in low-wellbeing conditions",
    value: "≈15% of output",
    source: {
      publication: "Gallup-style engagement research",
      note: "Low engagement and low wellbeing are associated with materially reduced productivity. ~15% is applied only when you do not enter your own productivity-loss figure.",
    },
    disclaimer: MODELLED,
    assumption: false,
  },
  {
    key: "presenteeism_absenteeism_ratio",
    name: "Presenteeism vs absenteeism cost",
    value: "presenteeism > absenteeism (≈1.5×)",
    source: {
      publication: "Workplace health literature",
      note: "Presenteeism — reduced output while still at work — is widely estimated to cost more than absenteeism. Used only to contextualise the breakdown, never to inflate the total.",
    },
    disclaimer: MODELLED,
    assumption: false,
  },
  {
    key: "stress_sick_day_uplift",
    name: "Extra sick days at high stress",
    value: "+2 days/year",
    source: {
      publication: "Occupational health estimates",
      note: "High workplace stress is associated with additional sickness absence. A conservative +2 days/year is modelled at high stress.",
    },
    disclaimer: MODELLED,
    assumption: false,
  },
];

export function getCoefficient(key: string): CoefficientDoc | undefined {
  return COEFFICIENT_CATALOG.find((c) => c.key === key);
}
