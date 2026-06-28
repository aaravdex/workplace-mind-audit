/**
 * Shared domain types. Kept infra-free so both pure logic (lib/scoring.ts,
 * lib/calculator.ts) and UI can import them. Expanded as later phases land.
 */

/** The 5C model dimensions. */
export type Dimension =
  | "capacity"
  | "clarity"
  | "control"
  | "connection"
  | "confidence";

/** Raw 1–5 Likert answer, or null when a respondent skips the question. */
export type LikertAnswer = 1 | 2 | 3 | 4 | 5 | null;

/** A single survey question in the bank (content/questions.ts, Phase 1). */
export interface Question {
  id: number;
  text: string;
  dimension: Dimension;
  /** When true, agreement indicates *worse* wellbeing → reverse-scored. */
  reverse: boolean;
}

/**
 * One anonymous response. NO user_id, NO name/email/IP — anonymity is enforced
 * by simply never collecting identity. `answers` maps questionId → Likert value.
 */
export interface SurveyResponse {
  /** Optional department/team tag, or null for "Prefer not to say". */
  segment: string | null;
  answers: Record<number, LikertAnswer>;
}

/** Health band for a 0–100 score (higher = healthier). */
export type RiskBand = "Healthy" | "Watch" | "Risk" | "Critical";

/** Per-dimension 0–100 scores plus the equal-weighted overall. */
export type DimensionScores = Record<Dimension, number>;

export interface ScoreSummary {
  dimensions: DimensionScores;
  overall: number;
  band: RiskBand;
  responseCount: number;
}

/** A rule-based diagnostic flag from combining dimension scores. */
export interface Insight {
  severity: "info" | "warning" | "critical";
  title: string;
  explanation: string;
}

/** Display currency for the calculator and pricing. */
export type Currency = "GBP" | "INR";
