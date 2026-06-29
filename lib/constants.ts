import type { Currency, Dimension, RiskBand, RiskLevel } from "@/types";

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
 * Used by lib/scoring.ts `riskBand()`. Bands are inclusive of both bounds and
 * contiguous across 0–100 (guarded by tests).
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

/** Visual treatment per band: hex for charts, Tailwind classes for UI chips. */
export const BAND_META: Record<
  RiskBand,
  { hex: string; bg: string; text: string; ring: string }
> = {
  Healthy: {
    hex: "#059669",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  Watch: {
    hex: "#0EA5E9",
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
  },
  Risk: {
    hex: "#D97706",
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
  },
  Critical: {
    hex: "#DC2626",
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
  },
};

// ── Currency ──────────────────────────────────────────────────────────────────

/** Supported display currencies (UK + India launch markets). */
export const CURRENCIES = ["GBP", "INR"] as const;
export const DEFAULT_CURRENCY: Currency = "GBP";

/** Currency display metadata: symbol + Intl locale (en-IN gives lakh grouping). */
export const CURRENCY_META: Record<
  Currency,
  { symbol: string; locale: string }
> = {
  GBP: { symbol: "£", locale: "en-GB" },
  INR: { symbol: "₹", locale: "en-IN" },
};

// ── Burnout Cost Calculator ───────────────────────────────────────────────────

/** Working days per year — basis for converting annual salary to a daily rate. */
export const WORKING_DAYS_PER_YEAR = 260;

/** Calculator risk levels, in ascending severity. */
export const RISK_LEVELS = [
  "Low",
  "Moderate",
  "High",
  "Critical",
] as const satisfies readonly RiskLevel[];

/**
 * Upper-exclusive cutoffs (3 cutoffs → 4 bands) mapping burnout cost as a % of
 * annual payroll onto RISK_LEVELS: <5 Low, <10 Moderate, <18 High, else Critical.
 */
export const COST_PCT_CUTOFFS = [5, 10, 18] as const;

/** Upper-exclusive cutoffs mapping "% of staff in high stress" onto RISK_LEVELS. */
export const STRESS_PCT_CUTOFFS = [20, 40, 60] as const;

/** The calculator's constant closing call-to-action. */
export const RUN_AUDIT_CTA =
  "Run a Workplace Mind Audit to identify the exact causes.";
