import type {
  Dimension,
  DimensionScores,
  Insight,
  LikertValue,
  RiskBand,
  ScoreSummary,
  SegmentScoreSummary,
  SegmentScoresResult,
  SuppressedSegment,
  SurveyResponse,
} from "@/types";
import {
  DIMENSIONS,
  MIN_RESPONSES_PER_SEGMENT,
  RISK_BAND_THRESHOLDS,
} from "@/lib/constants";
import { QUESTIONS_BY_DIMENSION } from "@/content/questions";

/**
 * Map a raw 1–5 Likert answer onto 0–100, where 100 is always the healthiest.
 * Forward: 1→0 … 5→100. Reverse: a "5" on "I often feel exhausted" → 0 (worst).
 */
export function normaliseAnswer(raw: LikertValue, reverse: boolean): number {
  return reverse ? ((5 - raw) / 4) * 100 : ((raw - 1) / 4) * 100;
}

/**
 * Average of all normalised answers for a dimension across all responses,
 * ignoring nulls and unanswered questions. Returns null when there is no data
 * at all (so missing data never masquerades as a score of 0). Rounded to int.
 */
export function dimensionScore(
  responses: SurveyResponse[],
  dimension: Dimension,
): number | null {
  const questions = QUESTIONS_BY_DIMENSION[dimension];
  let sum = 0;
  let n = 0;
  for (const response of responses) {
    for (const question of questions) {
      const raw = response.answers[question.id];
      if (raw === null || raw === undefined) continue; // skip skipped questions
      sum += normaliseAnswer(raw, question.reverse);
      n += 1;
    }
  }
  return n === 0 ? null : Math.round(sum / n);
}

/** All five dimension scores for a set of responses. */
export function dimensionScores(responses: SurveyResponse[]): DimensionScores {
  return DIMENSIONS.reduce((acc, d) => {
    acc[d] = dimensionScore(responses, d);
    return acc;
  }, {} as DimensionScores);
}

/** Equal-weighted mean of the (available) dimension scores. */
function meanOfDimensions(scores: DimensionScores): number | null {
  const present = DIMENSIONS.map((d) => scores[d]).filter(
    (v): v is number => v !== null,
  );
  if (present.length === 0) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
}

/** Overall Workplace Mind Score: equal-weighted mean of the five dimensions. */
export function overallScore(responses: SurveyResponse[]): number | null {
  return meanOfDimensions(dimensionScores(responses));
}

/** Classify a 0–100 score into a health band. */
export function riskBand(score: number): RiskBand {
  const match = RISK_BAND_THRESHOLDS.find(
    (t) => score >= t.min && score <= t.max,
  );
  if (match) return match.band;
  // Out-of-range guard (scores are clamped 0–100 in practice).
  return score < 0 ? "Critical" : "Healthy";
}

/** Full scored summary for a set of responses (whole audit or one segment). */
export function summarise(responses: SurveyResponse[]): ScoreSummary {
  const dimensions = dimensionScores(responses);
  const overall = meanOfDimensions(dimensions);
  return {
    dimensions,
    overall,
    band: overall === null ? null : riskBand(overall),
    responseCount: responses.length,
  };
}

/**
 * Rule-based diagnostic flags. Single scores describe; combinations diagnose.
 * A rule only fires when both of its dimensions have data — a null dimension
 * never triggers a flag.
 */
export function combinedInsights(scores: DimensionScores): Insight[] {
  const insights: Insight[] = [];
  const below = (v: number | null, threshold: number): boolean =>
    v !== null && v < threshold;

  if (below(scores.capacity, 50) && below(scores.connection, 55)) {
    insights.push({
      severity: "critical",
      title: "High burnout risk",
      explanation:
        "Heavy workload (low Capacity) combined with weak managerial and team support (low Connection) is the classic burnout signature: people are stretched and have no buffer to absorb it.",
    });
  }

  if (below(scores.confidence, 50) && below(scores.connection, 55)) {
    insights.push({
      severity: "warning",
      title: "Low innovation / silence risk",
      explanation:
        "Low psychological safety (Confidence) alongside weak Connection means people stay quiet — problems, ideas, and early warnings go unspoken until they become costly.",
    });
  }

  if (below(scores.clarity, 50) && below(scores.capacity, 55)) {
    insights.push({
      severity: "warning",
      title: "Execution-delay risk",
      explanation:
        "Unclear priorities (low Clarity) under heavy load (low Capacity) cause rework and stalled delivery: effort is spent, but on the wrong things.",
    });
  }

  return insights;
}

/**
 * Group responses by segment and score each. THE ANONYMITY GUARDRAIL: any
 * segment with fewer than MIN_RESPONSES_PER_SEGMENT responses is moved to
 * `suppressed` and carries only a count — never any scores. This is computed
 * here, in the scoring layer, so the API and UI cannot accidentally leak it.
 */
export function segmentScores(
  responses: SurveyResponse[],
): SegmentScoresResult {
  const groups = new Map<string | null, SurveyResponse[]>();
  for (const response of responses) {
    const key = response.segment ?? null;
    const existing = groups.get(key);
    if (existing) existing.push(response);
    else groups.set(key, [response]);
  }

  const reported: SegmentScoreSummary[] = [];
  const suppressed: SuppressedSegment[] = [];

  for (const [segment, group] of groups) {
    if (group.length >= MIN_RESPONSES_PER_SEGMENT) {
      reported.push({ segment, ...summarise(group) });
    } else {
      suppressed.push({ segment, responseCount: group.length });
    }
  }

  const byLabel = (a: { segment: string | null }, b: { segment: string | null }) =>
    (a.segment ?? "").localeCompare(b.segment ?? "");
  reported.sort(byLabel);
  suppressed.sort(byLabel);

  return { reported, suppressed };
}
