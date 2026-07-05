/**
 * Shared domain types. Kept infra-free so both pure logic (lib/scoring.ts,
 * lib/calculator.ts) and UI can import them.
 */

/** The 5C model dimensions. */
export type Dimension =
  | "capacity"
  | "clarity"
  | "control"
  | "connection"
  | "confidence";

/** A non-null 1–5 Likert value. */
export type LikertValue = 1 | 2 | 3 | 4 | 5;

/** A Likert answer, or null when a respondent skips the question. */
export type LikertAnswer = LikertValue | null;

/** A single survey question in the bank (content/questions.ts). */
export interface Question {
  id: number;
  text: string;
  dimension: Dimension;
  /** When true, agreement indicates *worse* wellbeing → reverse-scored. */
  reverse: boolean;
}

/**
 * One anonymous response. NO user_id, NO name/email/IP — anonymity is enforced
 * by never collecting identity. `answers` maps questionId → Likert value.
 */
export interface SurveyResponse {
  /** Optional department/team tag, or null for "Prefer not to say". */
  segment: string | null;
  answers: Record<number, LikertAnswer>;
}

/** Health band for a 0–100 score (higher = healthier). */
export type RiskBand = "Healthy" | "Watch" | "Risk" | "Critical";

/**
 * Per-dimension 0–100 scores. A dimension is `null` when no non-null answers
 * exist for it — distinct from a real score of 0, so missing data never reads
 * as "Critical".
 */
export type DimensionScores = Record<Dimension, number | null>;

/** A scored summary for a set of responses (whole audit or one segment). */
export interface ScoreSummary {
  dimensions: DimensionScores;
  overall: number | null;
  band: RiskBand | null;
  responseCount: number;
}

/** A segment that cleared the min-N threshold and may be reported. */
export interface SegmentScoreSummary extends ScoreSummary {
  segment: string | null;
}

/** A segment withheld for anonymity (too few responses) — never carries scores. */
export interface SuppressedSegment {
  segment: string | null;
  responseCount: number;
}

export interface SegmentScoresResult {
  reported: SegmentScoreSummary[];
  suppressed: SuppressedSegment[];
}

/** A rule-based diagnostic flag from combining dimension scores. */
export interface Insight {
  severity: "info" | "warning" | "critical";
  title: string;
  explanation: string;
}

// ── Calculator ────────────────────────────────────────────────────────────────

/** Display currency for the calculator and pricing. */
export type Currency = "GBP" | "INR";

/** Calculator risk classification, ascending severity. */
export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

/** How the workforce predominantly works (context signal). */
export type WorkMode = "onsite" | "hybrid" | "remote";

/** The four modelled annual cost lines. */
export interface CostBreakdown {
  absenteeism: number;
  presenteeism: number;
  attrition: number;
  managerOverload: number;
}

/** A human-readable top cost driver. */
export interface CostDriver {
  key: keyof CostBreakdown;
  label: string;
  amount: number;
  shareOfTotalPct: number;
  formatted: string;
}

// ── Persistence (Supabase row shapes) ────────────────────────────────────────

export type AuditStatus = "draft" | "open" | "closed";

/** Headcount band — an org record field and a benchmark segmentation key. */
export type SizeBand = "1-9" | "10-49" | "50-199" | "200-999" | "1000+";

/** Controlled sector list — an org record field and a benchmark segmentation key. */
export type Sector =
  | "SaaS / Software"
  | "Professional Services"
  | "Finance"
  | "Healthcare"
  | "Retail / E-commerce"
  | "Manufacturing"
  | "Education"
  | "Public Sector"
  | "Nonprofit"
  | "Other";

export interface Organisation {
  id: string;
  name: string;
  industry: string | null;
  sector: Sector | null;
  size_band: SizeBand | null;
  owner_user_id: string;
  created_at: string;
}

export interface Audit {
  id: string;
  org_id: string;
  title: string;
  status: AuditStatus;
  public_token: string;
  segments: string[];
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
}

// ── Factor ontology (Phase 1A) ────────────────────────────────────────────────

/** How a factor relates to wellbeing risk. Outcomes are RESULTS, never causes. */
export type FactorCategory =
  | "hazard"
  | "resource"
  | "outcome"
  | "context"
  | "readiness";

/**
 * A factor nests under a 5C dimension. "outcome" is reserved for future
 * standalone outcome factors; every Core factor nests under a real C, so the
 * 5C dimension scoring and benchmarks are never disturbed.
 */
export type FiveCOrOutcome = Dimension | "outcome";

/**
 * Semantic polarity of the raw construct, for interpretation phrasing only —
 * NOT used in numeric scoring. Factor scores are always 0–100 with 100 =
 * healthiest (identical to dimension scores), regardless of this field.
 */
export type ScoringDirection = "positive" | "negative";

/**
 * Lowercase risk levels used across the new analysis engines. "high" is the
 * platform's "Risk" band under a new name; kept distinct so the deterministic
 * `RiskBand` type used by scoring/benchmark is never touched.
 */
export type FactorRiskLevel = "healthy" | "watch" | "high" | "critical";

export interface FactorRiskThresholds {
  healthy: { min: number; max: number };
  watch: { min: number; max: number };
  high: { min: number; max: number };
  critical: { min: number; max: number };
}

/**
 * A subfactor beneath the 5C model. `questionIds` are NUMBERS (matching
 * `Question.id` and the `answers` keying) — a deliberate deviation from the
 * abstract spec's string ids, for type-safe compatibility with existing data.
 * `sourceReferences` name public frameworks as design inspiration only, never
 * as validation citations or statistics for these specific items.
 */
export interface Factor {
  id: string;
  name: string;
  category: FactorCategory;
  fiveC: FiveCOrOutcome;
  description: string;
  questionIds: number[];
  scoringDirection: ScoringDirection;
  minimumResponses: number;
  riskThresholds: FactorRiskThresholds;
  sourceReferences: string[];
}
