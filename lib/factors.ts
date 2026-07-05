import type { Dimension, Factor, FactorRiskLevel, SurveyResponse } from "@/types";
import { DIMENSIONS } from "@/lib/constants";
import { normaliseAnswer } from "@/lib/scoring";
import { QUESTIONS_BY_ID } from "@/content/questions";
import { DEFAULT_FACTOR_RISK_THRESHOLDS, FACTORS } from "@/content/factors";

/**
 * Factor scoring — a pure RESOLUTION layer over the 5C model. It reuses the
 * exact reverse-aware normalisation from lib/scoring.ts, so a factor score uses
 * the same "0–100, 100 = healthiest" convention as a dimension score and never
 * changes an existing number. Dimension scoring itself is untouched.
 */

/**
 * Mean of the available normalised answers for a factor's questions. Returns
 * null when the factor has no data at all, so missing data never masquerades as
 * a score of 0 (mirrors lib/scoring.ts `dimensionScore`). Rounded to int.
 */
export function factorScore(
  responses: SurveyResponse[],
  factor: Factor,
): number | null {
  let sum = 0;
  let n = 0;
  for (const response of responses) {
    for (const qId of factor.questionIds) {
      const question = QUESTIONS_BY_ID.get(qId);
      if (!question) continue;
      const raw = response.answers[qId];
      if (raw === null || raw === undefined) continue; // skip skipped questions
      sum += normaliseAnswer(raw, question.reverse);
      n += 1;
    }
  }
  return n === 0 ? null : Math.round(sum / n);
}

/** Every factor's score (or null) for a set of responses, keyed by factor id. */
export function factorScores(
  responses: SurveyResponse[],
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const factor of FACTORS) out[factor.id] = factorScore(responses, factor);
  return out;
}

/**
 * Classify a 0–100 factor score into a factor risk level, using the factor's
 * own thresholds when set, otherwise the platform defaults. Bands are checked by
 * descending lower bound so they stay contiguous.
 */
export function factorRiskLevel(
  score: number,
  factor?: Factor,
): FactorRiskLevel {
  const t = factor?.riskThresholds ?? DEFAULT_FACTOR_RISK_THRESHOLDS;
  if (score >= t.healthy.min) return "healthy";
  if (score >= t.watch.min) return "watch";
  if (score >= t.high.min) return "high";
  return "critical";
}

/** An outcome is a wellbeing RESULT, never a cause — used by later engines to
 *  refuse treating it as something to fix directly. */
export function isOutcomeFactor(factor: Factor): boolean {
  return factor.category === "outcome";
}

/** Factors grouped under their 5C dimension (Core factors always nest under a C). */
export const FACTORS_BY_DIMENSION: Record<Dimension, Factor[]> =
  DIMENSIONS.reduce(
    (acc, d) => {
      acc[d] = FACTORS.filter((f) => f.fiveC === d);
      return acc;
    },
    {} as Record<Dimension, Factor[]>,
  );
