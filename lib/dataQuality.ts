import type { LikertAnswer, SurveyResponse } from "@/types";
import { MIN_RESPONSES_PER_SEGMENT } from "@/lib/constants";
import { normaliseAnswer } from "@/lib/scoring";
import { QUESTIONS, QUESTIONS_BY_ID } from "@/content/questions";

/**
 * DATA QUALITY & CONFIDENCE ENGINE (Phase 2A) — pure and deterministic.
 *
 * Turns raw responses into an honest picture of how much the data can bear:
 * response accounting, item missingness, response-integrity flags, and a
 * confidence rating. It reads ONLY the existing `answers` data — nothing new is
 * recorded on the anonymous `responses` row (no timing, no "started" tracking).
 * Integrity flags are computed transiently and never persisted.
 */

// ── Tunable, deterministic thresholds (documented; adjustable later) ───────────
const STRAIGHTLINE_MIN_ITEMS = 10; // "zero variance across 10+ items"
const CONTRADICTION_DIVERGENCE = 75; // normalised-score gap that is incompatible
const MODERATE_SAMPLE = 10;
const STRONG_SAMPLE = 30;
const LOW_RESPONSE_RATE_PCT = 30;
const HIGH_INTEGRITY_FLAG_RATE = 0.2;

/**
 * Explicit, opposite-polarity item pairs measuring closely related constructs.
 * A consistent respondent answers both compatibly; a wide gap between their
 * (reverse-aware) normalised scores signals careless/contradictory answering.
 * Conservative by design — strong near-antonyms only, to avoid false positives.
 */
const CONTRADICTION_PAIRS: readonly [number, number][] = [
  [11, 14], // "I have control over how I work" vs "I feel micromanaged"
  [6, 9], //  "I understand what's expected" vs "I receive conflicting instructions"
  [8, 10], // "I know what success looks like" vs "I'm unsure what to focus on first"
];

export type ConfidenceLevel =
  | "high"
  | "moderate"
  | "exploratory"
  | "insufficient";

export interface ItemMissingness {
  questionId: number;
  answered: number;
  missing: number;
  missingPct: number;
}

export interface IntegrityFlags {
  straightLining: number;
  contradictions: number;
  flaggedResponses: number;
  flaggedPct: number;
}

export interface SegmentParticipation {
  segment: string | null;
  responseCount: number;
  sharePct: number;
}

export interface DataQuality {
  completed: number;
  /** Not tracked: rows exist only for completed submissions (by design, to keep
   *  the anonymous survey's data surface minimal). */
  started: number | null;
  invited: number | null;
  responseRate: number | null;
  responseRateLabel: string;
  itemMissingness: ItemMissingness[];
  overallMissingnessPct: number;
  integrity: IntegrityFlags;
  participation: SegmentParticipation[];
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  /** Effective segment reporting threshold (never below the platform floor). */
  reportingThreshold: number;
}

/** A single response giving the SAME raw Likert value across ≥ minItems answered
 *  items (zero variance) — a careless-response signal. Uses RAW answers, since
 *  agreeing to both a positive and its reverse-worded item is itself low-quality. */
export function isStraightLining(
  answers: SurveyResponse["answers"],
  minItems: number = STRAIGHTLINE_MIN_ITEMS,
): boolean {
  const values: number[] = [];
  for (const v of Object.values(answers)) {
    if (v !== null && v !== undefined) values.push(v);
  }
  if (values.length < minItems) return false;
  return new Set(values).size === 1;
}

/** How many contradiction pairs this response answered incompatibly. */
export function contradictionCount(answers: SurveyResponse["answers"]): number {
  let n = 0;
  for (const [a, b] of CONTRADICTION_PAIRS) {
    const ra: LikertAnswer | undefined = answers[a];
    const rb: LikertAnswer | undefined = answers[b];
    if (ra == null || rb == null) continue;
    const qa = QUESTIONS_BY_ID.get(a);
    const qb = QUESTIONS_BY_ID.get(b);
    if (!qa || !qb) continue;
    const gap = Math.abs(
      normaliseAnswer(ra, qa.reverse) - normaliseAnswer(rb, qb.reverse),
    );
    if (gap >= CONTRADICTION_DIVERGENCE) n += 1;
  }
  return n;
}

const LADDER: ConfidenceLevel[] = [
  "insufficient",
  "exploratory",
  "moderate",
  "high",
];

/**
 * Confidence a finding's evidence can support. Deterministic: sized by sample,
 * then downgraded for a low response rate or a high rate of low-quality
 * responses. Below the platform floor it is always "insufficient"; at/above the
 * floor it never drops below "exploratory" (there IS data, just weak).
 */
export function confidenceRating(input: {
  responseCount: number;
  responseRate: number | null;
  integrityFlagRate: number;
  segmentAgreement?: boolean;
}): { level: ConfidenceLevel; reasons: string[] } {
  const { responseCount, responseRate, integrityFlagRate } = input;

  if (responseCount < MIN_RESPONSES_PER_SEGMENT) {
    return {
      level: "insufficient",
      reasons: [
        `Only ${responseCount} response${responseCount === 1 ? "" : "s"} — fewer than the minimum of ${MIN_RESPONSES_PER_SEGMENT} needed to interpret.`,
      ],
    };
  }

  const reasons: string[] = [];
  let idx: number;
  if (responseCount < MODERATE_SAMPLE) {
    idx = 1;
    reasons.push(`${responseCount} responses — a small sample.`);
  } else if (responseCount < STRONG_SAMPLE) {
    idx = 2;
    reasons.push(`${responseCount} responses — a moderate sample.`);
  } else {
    idx = 3;
    reasons.push(`${responseCount} responses — a strong sample.`);
  }

  if (responseRate !== null && responseRate < LOW_RESPONSE_RATE_PCT) {
    idx -= 1;
    reasons.push(`Low response rate (${responseRate}%) widens uncertainty.`);
  } else if (responseRate !== null) {
    reasons.push(`Response rate ${responseRate}%.`);
  }

  if (integrityFlagRate > HIGH_INTEGRITY_FLAG_RATE) {
    idx -= 1;
    reasons.push(
      `${Math.round(integrityFlagRate * 100)}% of responses show low-quality patterns.`,
    );
  }

  if (input.segmentAgreement) {
    reasons.push("Corroborated by agreement across segments.");
  }

  idx = Math.max(1, Math.min(3, idx));
  return { level: LADDER[idx], reasons };
}

/** Full data-quality picture for a set of responses. Pure. */
export function computeDataQuality(
  responses: SurveyResponse[],
  opts: { invitedCount?: number | null; reportingThreshold?: number } = {},
): DataQuality {
  const completed = responses.length;
  const invited = opts.invitedCount ?? null;
  const reportingThreshold = Math.max(
    MIN_RESPONSES_PER_SEGMENT,
    opts.reportingThreshold ?? MIN_RESPONSES_PER_SEGMENT,
  );

  const responseRate =
    invited && invited > 0 ? Math.round((completed / invited) * 100) : null;
  const responseRateLabel =
    responseRate === null ? "denominator not provided" : `${responseRate}%`;

  const itemMissingness: ItemMissingness[] = QUESTIONS.map((q) => {
    let answered = 0;
    for (const r of responses) {
      const v = r.answers[q.id];
      if (v !== null && v !== undefined) answered += 1;
    }
    const missing = completed - answered;
    return {
      questionId: q.id,
      answered,
      missing,
      missingPct: completed ? Math.round((missing / completed) * 100) : 0,
    };
  });
  const totalCells = completed * QUESTIONS.length;
  const totalMissing = itemMissingness.reduce((s, m) => s + m.missing, 0);
  const overallMissingnessPct = totalCells
    ? Math.round((totalMissing / totalCells) * 100)
    : 0;

  let straightLining = 0;
  let contradictions = 0;
  let flaggedResponses = 0;
  for (const r of responses) {
    const sl = isStraightLining(r.answers);
    const cc = contradictionCount(r.answers) > 0;
    if (sl) straightLining += 1;
    if (cc) contradictions += 1;
    if (sl || cc) flaggedResponses += 1;
  }
  const integrity: IntegrityFlags = {
    straightLining,
    contradictions,
    flaggedResponses,
    flaggedPct: completed ? Math.round((flaggedResponses / completed) * 100) : 0,
  };

  const bySeg = new Map<string | null, number>();
  for (const r of responses) {
    const key = r.segment ?? null;
    bySeg.set(key, (bySeg.get(key) ?? 0) + 1);
  }
  const participation: SegmentParticipation[] = [...bySeg.entries()]
    .map(([segment, responseCount]) => ({
      segment,
      responseCount,
      sharePct: completed ? Math.round((responseCount / completed) * 100) : 0,
    }))
    .sort((a, b) => b.responseCount - a.responseCount);

  const { level, reasons } = confidenceRating({
    responseCount: completed,
    responseRate,
    integrityFlagRate: completed ? flaggedResponses / completed : 0,
  });

  return {
    completed,
    started: null,
    invited,
    responseRate,
    responseRateLabel,
    itemMissingness,
    overallMissingnessPct,
    integrity,
    participation,
    confidence: level,
    confidenceReasons: reasons,
    reportingThreshold,
  };
}
