import type { Factor, FactorRiskThresholds } from "@/types";
import { MIN_RESPONSES_PER_SEGMENT } from "@/lib/constants";

/**
 * FACTOR ONTOLOGY (Phase 1A) — subfactors nested under the 5C model.
 *
 * The 5C dimensions remain the top-level categories and the spine of scoring,
 * benchmarking, and every existing report. Factors add RESOLUTION: each factor
 * groups one or more of the existing 25 questions so the interpretation engine
 * can say "68% report unrealistic deadlines" rather than only "Capacity: 38".
 *
 * Compatibility guarantees (asserted in tests/factors.test.ts):
 *   • Every question 1–25 belongs to exactly one factor.
 *   • Each factor's `fiveC` equals the 5C dimension of every question it holds,
 *     so factor scores roll up consistently with dimension scores. Nothing about
 *     dimension scoring, benchmarks, or existing responses changes.
 *   • `questionIds` are NUMBERS (not strings as in the abstract schema) to match
 *     the existing `Question.id: number` and `SurveyResponse.answers` keying.
 *
 * OUTCOME factors (category "outcome": exhaustion, belonging, future
 * confidence/intent-to-stay) are wellbeing RESULTS, never causes. Later engines
 * must explain them via the other factors and never prescribe against them
 * directly. Tagged here; enforced in Phases 3 & 5.
 *
 * `sourceReferences` name real public frameworks as DESIGN INSPIRATION only
 * (HSE Management Standards areas; named psychological constructs). They are NOT
 * validation citations for these specific items and carry no statistics.
 */

/**
 * Platform default bands (0–100, 100 = healthiest), inherited from
 * RISK_BAND_THRESHOLDS but keyed to the new lowercase factor levels
 * (the platform's "Risk" band → "high") used across the seven engines.
 * Configurable per factor.
 */
export const DEFAULT_FACTOR_RISK_THRESHOLDS: FactorRiskThresholds = {
  healthy: { min: 80, max: 100 },
  watch: { min: 60, max: 79 },
  high: { min: 40, max: 59 },
  critical: { min: 0, max: 39 },
};

type FactorDef = Pick<
  Factor,
  | "id"
  | "name"
  | "category"
  | "fiveC"
  | "description"
  | "questionIds"
  | "scoringDirection"
> &
  Partial<Pick<Factor, "minimumResponses" | "riskThresholds" | "sourceReferences">>;

/** Thin constructor that injects the shared defaults, keeping records readable
 *  while every factor conforms to the full schema. Data, not logic. */
function defineFactor(f: FactorDef): Factor {
  return {
    minimumResponses: MIN_RESPONSES_PER_SEGMENT,
    riskThresholds: DEFAULT_FACTOR_RISK_THRESHOLDS,
    sourceReferences: [],
    ...f,
  };
}

export const FACTORS: Factor[] = [
  // ── Capacity — workload, energy, recovery ────────────────────────────────────
  defineFactor({
    id: "capacity-workload",
    name: "Quantitative workload",
    category: "hazard",
    fiveC: "capacity",
    description:
      "Whether the volume of work can be completed within normal working hours.",
    questionIds: [1, 2],
    scoringDirection: "negative",
    sourceReferences: ["HSE Management Standards: Demands"],
  }),
  defineFactor({
    id: "capacity-pace",
    name: "Work-pace pressure",
    category: "hazard",
    fiveC: "capacity",
    description: "Time pressure to work faster than is comfortable.",
    questionIds: [5],
    scoringDirection: "negative",
    sourceReferences: ["HSE Management Standards: Demands"],
  }),
  defineFactor({
    id: "capacity-recovery",
    name: "Recovery & rest",
    category: "resource",
    fiveC: "capacity",
    description: "Adequacy of recovery time after periods of intense work.",
    questionIds: [4],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Demands"],
  }),
  defineFactor({
    id: "capacity-exhaustion",
    name: "Emotional exhaustion",
    category: "outcome",
    fiveC: "capacity",
    description:
      "Reported mental exhaustion from work. An OUTCOME of capacity strain — never treated as a cause, and never prescribed against directly.",
    questionIds: [3],
    scoringDirection: "negative",
    sourceReferences: ["Burnout — exhaustion component (named construct)"],
  }),

  // ── Clarity — role, priorities, expectations ─────────────────────────────────
  defineFactor({
    id: "clarity-role",
    name: "Role clarity",
    category: "resource",
    fiveC: "clarity",
    description: "Understanding of expectations and what success looks like.",
    questionIds: [6, 8],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Role"],
  }),
  defineFactor({
    id: "clarity-priorities",
    name: "Priority clarity",
    category: "resource",
    fiveC: "clarity",
    description: "Clarity of priorities and what to focus on first.",
    questionIds: [7, 10],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Role"],
  }),
  defineFactor({
    id: "clarity-role-conflict",
    name: "Role conflict",
    category: "hazard",
    fiveC: "clarity",
    description: "Receiving conflicting instructions or incompatible demands.",
    questionIds: [9],
    scoringDirection: "negative",
    sourceReferences: ["HSE Management Standards: Role"],
  }),

  // ── Control — autonomy, flexibility ──────────────────────────────────────────
  defineFactor({
    id: "control-autonomy",
    name: "Job autonomy & flexibility",
    category: "resource",
    fiveC: "control",
    description: "Control and flexibility over how work is carried out.",
    questionIds: [11, 13],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Control"],
  }),
  defineFactor({
    id: "control-decision-involvement",
    name: "Decision involvement & trust",
    category: "resource",
    fiveC: "control",
    description:
      "Being trusted to make decisions and able to influence decisions affecting one's work.",
    questionIds: [12, 15],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Control"],
  }),
  defineFactor({
    id: "control-micromanagement",
    name: "Micromanagement",
    category: "hazard",
    fiveC: "control",
    description: "Experience of being micromanaged.",
    questionIds: [14],
    scoringDirection: "negative",
    sourceReferences: ["HSE Management Standards: Control"],
  }),

  // ── Connection — manager support, team, recognition ──────────────────────────
  defineFactor({
    id: "connection-manager-support",
    name: "Manager support",
    category: "resource",
    fiveC: "connection",
    description: "Manager support when facing difficulties.",
    questionIds: [16],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Support"],
  }),
  defineFactor({
    id: "connection-civility",
    name: "Team civility & conflict handling",
    category: "resource",
    fiveC: "connection",
    description:
      "Respect between colleagues and constructive handling of conflict.",
    questionIds: [17, 19],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Relationships"],
  }),
  defineFactor({
    id: "connection-recognition",
    name: "Recognition",
    category: "resource",
    fiveC: "connection",
    description: "Feeling recognised for one's contribution.",
    questionIds: [18],
    scoringDirection: "positive",
    sourceReferences: ["Effort–reward balance (named construct)"],
  }),
  defineFactor({
    id: "connection-belonging",
    name: "Belonging",
    category: "outcome",
    fiveC: "connection",
    description:
      "Sense of belonging in the team. An OUTCOME (treated like intent-to-stay): explained by manager support, civility and recognition — never prescribed against directly.",
    questionIds: [20],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Relationships"],
  }),

  // ── Confidence — psychological safety, trust, future ─────────────────────────
  defineFactor({
    id: "confidence-psych-safety",
    name: "Psychological safety",
    category: "resource",
    fiveC: "confidence",
    description:
      "Safety to raise concerns, admit mistakes, and voice different opinions.",
    questionIds: [21, 22, 23],
    scoringDirection: "positive",
    sourceReferences: ["Psychological safety (Edmondson) — named construct"],
  }),
  defineFactor({
    id: "confidence-leadership-trust",
    name: "Trust in leadership",
    category: "resource",
    fiveC: "confidence",
    description: "Trust that leadership will act on employee concerns.",
    questionIds: [24],
    scoringDirection: "positive",
    sourceReferences: ["HSE Management Standards: Change"],
  }),
  defineFactor({
    id: "confidence-future",
    name: "Confidence in the future",
    category: "outcome",
    fiveC: "confidence",
    description:
      "Confidence about one's future in the organisation (an intent-to-stay signal). An OUTCOME — explained by the other factors, never prescribed against directly.",
    questionIds: [25],
    scoringDirection: "positive",
    sourceReferences: ["Turnover intention (named construct)"],
  }),
];

/** O(1) lookup of a factor by id. */
export const FACTORS_BY_ID: Map<string, Factor> = new Map(
  FACTORS.map((f) => [f.id, f]),
);
