import type { Dimension, RiskBand } from "@/types";

/**
 * ANONYMITY GUARDRAIL.
 * No segment (e.g. a department) may be reported unless at least this many
 * people responded within it — otherwise a small team's score could be used to
 * de-anonymise individuals. Enforced in the scoring layer (lib/scoring.ts) and
 * the scores API, NOT merely in the UI, so it cannot be bypassed via the API.
 */
export const MIN_RESPONSES_PER_SEGMENT = 5;

/**
 * Verbatim legal/ethical disclaimer. Must render unchanged on every survey and
 * every report. Do not paraphrase.
 */
export const DISCLAIMER =
  "Workplace Mind Audit is an organisational wellbeing and workplace risk assessment tool. It is not a medical, psychiatric, or diagnostic service. It does not diagnose mental health conditions. Results identify aggregated workplace risk patterns to help organisations improve working conditions.";

/** Positioning line used across marketing surfaces. */
export const TRUST_LINE =
  "Built at the intersection of organisational psychology, behavioural economics, and workplace mental health.";

/** The 5C model, in canonical order. The spine of the entire product. */
export const DIMENSIONS = [
  "capacity",
  "clarity",
  "control",
  "connection",
  "confidence",
] as const satisfies readonly Dimension[];

/** Human-facing labels and one-line definitions for each dimension. */
export const DIMENSION_META: Record<
  Dimension,
  { label: string; blurb: string }
> = {
  capacity: {
    label: "Capacity",
    blurb: "Workload, energy, and recovery — can people sustain the pace?",
  },
  clarity: {
    label: "Clarity",
    blurb: "Role, priorities, and expectations — do people know what matters?",
  },
  control: {
    label: "Control",
    blurb: "Autonomy and flexibility — can people shape how they work?",
  },
  connection: {
    label: "Connection",
    blurb: "Manager support, team respect, and recognition.",
  },
  confidence: {
    label: "Confidence",
    blurb: "Psychological safety, trust, and belief in the future.",
  },
};

/**
 * Risk-band thresholds on the 0–100 scale (higher = healthier).
 * Used by lib/scoring.ts `riskBand()`. Bands are inclusive of their lower bound.
 */
export const RISK_BAND_THRESHOLDS: {
  band: RiskBand;
  min: number;
  max: number;
}[] = [
  { band: "Healthy", min: 80, max: 100 },
  { band: "Watch", min: 60, max: 79 },
  { band: "Risk", min: 40, max: 59 },
  { band: "Critical", min: 0, max: 39 },
];

/** Supported display currencies (UK + India launch markets). */
export const CURRENCIES = ["GBP", "INR"] as const;
export const DEFAULT_CURRENCY = "GBP";

/** Working days per year — basis for converting annual salary to a daily rate. */
export const WORKING_DAYS_PER_YEAR = 260;
