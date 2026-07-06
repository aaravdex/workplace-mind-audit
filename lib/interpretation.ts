import type {
  Dimension,
  Factor,
  FactorRiskLevel,
  LikertValue,
  SegmentScoresResult,
  SurveyResponse,
} from "@/types";
import { DIMENSIONS, DIMENSION_META } from "@/lib/constants";
import { dimensionScore, normaliseAnswer, segmentScores } from "@/lib/scoring";
import { factorRiskLevel, FACTORS_BY_DIMENSION } from "@/lib/factors";
import { QUESTIONS_BY_DIMENSION } from "@/content/questions";
import { BUSINESS_IMPACT } from "@/lib/report-content";
import {
  confidenceRating,
  type ConfidenceLevel,
  type DataQuality,
} from "@/lib/dataQuality";
import type { ContextSignals } from "@/lib/context";

/**
 * INTERPRETATION ENGINE (Phase 3A) — deterministic, template-driven Findings.
 *
 * Every dimension becomes a structured Finding built by slot-filling REAL data
 * (no LLM, no invention). It rigorously separates observation from
 * interpretation from hypothesis (constraint #2): interpretations use "the
 * pattern is consistent with…", hypotheses use "a plausible contributing factor
 * is…" and always carry alternatives, validation questions, and a causation
 * disclaimer. A hypothesis is never stated as fact and causation is never
 * claimed from cross-sectional data — enforced by tests.
 */

const FAVOURABLE_MIN = 67; // normalised ≥ this = favourable (raw 4–5 fwd / 1–2 rev)
const UNFAVOURABLE_MAX = 33; // normalised ≤ this = unfavourable
const MAX_DRIVERS = 3;
const GROUP_DIFF_DELTA = 8; // a segment this far below the mean is "concentrated"

export const CAUSATION_DISCLAIMER =
  "The survey does not establish causation; these are cross-sectional, self-reported patterns to validate through consultation, not proven causes.";

export interface ItemDriver {
  questionId: number;
  text: string;
  favourablePct: number;
  neutralPct: number;
  unfavourablePct: number;
  direction: "favourable" | "unfavourable";
}

export interface GroupDifference {
  segment: string;
  score: number;
  /** Difference from the dimension mean (negative = below). */
  delta: number;
}

export interface FindingEvidence {
  itemDrivers: ItemDriver[];
  responseDistributions: ItemDriver[];
  groupDifferences: GroupDifference[];
  openTextThemes: string[]; // populated in Phase 7
  operationalMetrics: string[]; // populated when context indicators exist
}

export interface Finding {
  findingId: string;
  title: string;
  dimension: Dimension;
  factorIds: string[];
  overallScore: number | null;
  riskLevel: FactorRiskLevel | null;
  confidence: ConfidenceLevel;
  responseCount: number;
  evidence: FindingEvidence;
  observation: string;
  interpretation: string;
  rootCauseHypotheses: string[];
  alternativeExplanations: string[];
  businessImplications: string[];
  employeeImplications: string[];
  validationQuestions: string[];
  limitations: string[];
  /** Computed in Phase 4 (Risk Prioritisation). Placeholder here. */
  priorityScore: number;
}

const LEVEL_LABEL: Record<FactorRiskLevel, string> = {
  healthy: "healthy",
  watch: "watch",
  high: "high risk",
  critical: "critical",
};

const DIM_HYPOTHESIS: Record<Dimension, string> = {
  capacity: "workload and available capacity are out of balance",
  clarity: "priorities or expectations are unclear or in conflict",
  control: "people have limited say over how their work is done",
  connection: "manager support or recognition is inconsistent",
  confidence:
    "it is not yet felt safe to speak up, or that raising concerns leads to action",
};

const DIM_VALIDATION: Record<Dimension, string[]> = {
  capacity: [
    "In focus groups, which periods and tasks create the most pressure — and is it volume, deadlines, or staffing?",
    "What work could realistically be stopped, deferred, or resourced differently?",
  ],
  clarity: [
    "Where do people most often receive conflicting instructions, and who owns the final call?",
    "Which priorities change most frequently, and why?",
  ],
  control: [
    "Which decisions do people feel unable to make that they reasonably could?",
    "Where does oversight feel like monitoring rather than support?",
  ],
  connection: [
    "What does good manager support look like here, and where is it missing?",
    "Is recognition experienced as fair and specific, or absent and generic?",
  ],
  confidence: [
    "What actually happens when someone raises a concern or admits a mistake?",
    "Where has past feedback visibly led to action — or not?",
  ],
};

const DIM_EMPLOYEE_IMPLICATION: Record<Dimension, string> = {
  capacity:
    "People report sustained pressure, which over time tends to show up as fatigue, sickness, and people leaving.",
  clarity:
    "People report effort spent on the wrong things, which is both demoralising and wasteful.",
  control:
    "People report limited ownership, which tends to erode engagement and initiative.",
  connection:
    "People report feeling unsupported or unrecognised — a leading marker of quiet disengagement.",
  confidence:
    "People report holding back concerns and ideas, so problems tend to surface late and improvement stalls.",
};

const BASE_ALTERNATIVES = [
  "the result may reflect a recent, one-off event rather than a systemic issue",
  "measurement timing (for example a busy period) may have coloured responses",
];

function contextClauses(signals: ContextSignals): string[] {
  const c: string[] = [];
  if (signals.seasonalPeak)
    c.push(
      "the audit was taken during a reported seasonal peak, which would be expected to amplify strain",
    );
  if (signals.postRestructuring)
    c.push(
      "the organisation is in a reported period of restructuring or leadership change, a known source of uncertainty",
    );
  if (signals.rapidGrowth)
    c.push(
      "reported rapid growth can outpace the supporting structures and staffing",
    );
  if (signals.workforceContraction)
    c.push(
      "recent layoffs or resignations can concentrate workload on those who remain",
    );
  if (signals.revenuePressure)
    c.push("reported revenue pressure can translate into sustained delivery pressure");
  return c;
}

function classify(
  raw: LikertValue,
  reverse: boolean,
): "favourable" | "neutral" | "unfavourable" {
  const n = normaliseAnswer(raw, reverse);
  if (n >= FAVOURABLE_MIN) return "favourable";
  if (n <= UNFAVOURABLE_MAX) return "unfavourable";
  return "neutral";
}

function itemDistribution(
  responses: SurveyResponse[],
  question: { id: number; text: string; reverse: boolean },
): ItemDriver {
  let fav = 0;
  let neu = 0;
  let unf = 0;
  let n = 0;
  for (const r of responses) {
    const raw = r.answers[question.id];
    if (raw === null || raw === undefined) continue;
    const cls = classify(raw, question.reverse);
    if (cls === "favourable") fav += 1;
    else if (cls === "unfavourable") unf += 1;
    else neu += 1;
    n += 1;
  }
  const pct = (x: number) => (n ? Math.round((x / n) * 100) : 0);
  const favourablePct = pct(fav);
  const unfavourablePct = pct(unf);
  return {
    questionId: question.id,
    text: question.text,
    favourablePct,
    neutralPct: pct(neu),
    unfavourablePct,
    direction: unfavourablePct >= favourablePct ? "unfavourable" : "favourable",
  };
}

interface FindingContext {
  responses: SurveyResponse[];
  dataQuality: DataQuality;
  contextSignals: ContextSignals;
  segments: SegmentScoresResult;
  hasCostFigures: boolean;
}

export function buildFinding(
  dimension: Dimension,
  ctx: FindingContext,
): Finding {
  const { responses, dataQuality, contextSignals, segments, hasCostFigures } =
    ctx;
  const label = DIMENSION_META[dimension].label;
  const questions = QUESTIONS_BY_DIMENSION[dimension];
  const factorIds = FACTORS_BY_DIMENSION[dimension].map((f: Factor) => f.id);
  const score = dimensionScore(responses, dimension);
  const dimResponseCount = responses.filter((r) =>
    questions.some((q) => r.answers[q.id] !== null && r.answers[q.id] !== undefined),
  ).length;
  const integrityFlagRate = dataQuality.completed
    ? dataQuality.integrity.flaggedResponses / dataQuality.completed
    : 0;
  const { level: confidence } = confidenceRating({
    responseCount: dimResponseCount,
    responseRate: dataQuality.responseRate,
    integrityFlagRate,
  });
  const responseDistributions = questions.map((q) =>
    itemDistribution(responses, q),
  );
  const findingId = `finding-${dimension}`;

  // Insufficient / unmeasured — reported for transparency, never as a conclusion.
  if (score === null || confidence === "insufficient") {
    return {
      findingId,
      title: `${label} — insufficient data`,
      dimension,
      factorIds,
      overallScore: score,
      riskLevel: score === null ? null : factorRiskLevel(score),
      confidence,
      responseCount: dimResponseCount,
      evidence: {
        itemDrivers: [],
        responseDistributions,
        groupDifferences: [],
        openTextThemes: [],
        operationalMetrics: [],
      },
      observation:
        score === null
          ? `The data shows ${label} was not answered by enough respondents to measure in this audit.`
          : `The data shows ${label} scored ${score}/100, but from only ${dimResponseCount} response(s) — not reliable enough to interpret.`,
      interpretation:
        "This finding is not reliable enough to interpret. It is reported for transparency, not as a conclusion.",
      rootCauseHypotheses: [],
      alternativeExplanations: [],
      businessImplications: [],
      employeeImplications: [],
      validationQuestions: [
        `Gather more responses covering ${label} before drawing any conclusion.`,
      ],
      limitations: [
        CAUSATION_DISCLAIMER,
        `Based on ${dimResponseCount} response(s) at ${confidence} confidence.`,
      ],
      priorityScore: 0,
    };
  }

  const level = factorRiskLevel(score);
  const atRisk = level === "high" || level === "critical" || level === "watch";

  const sorted = [...responseDistributions].sort((a, b) =>
    atRisk
      ? b.unfavourablePct - a.unfavourablePct
      : b.favourablePct - a.favourablePct,
  );
  const itemDrivers = sorted
    .filter((d) => (atRisk ? d.unfavourablePct > 0 : d.favourablePct > 0))
    .slice(0, MAX_DRIVERS);

  const groupDifferences: GroupDifference[] = segments.reported
    .filter((s) => s.segment !== null && s.dimensions[dimension] !== null)
    .map((s) => ({
      segment: s.segment as string,
      score: s.dimensions[dimension] as number,
      delta: (s.dimensions[dimension] as number) - score,
    }))
    .filter((g) => g.delta <= -GROUP_DIFF_DELTA)
    .sort((a, b) => a.delta - b.delta);

  const clauses = contextClauses(contextSignals);
  const topDriver = itemDrivers[0];
  const driverPhrase = topDriver
    ? atRisk
      ? `most notably, ${topDriver.unfavourablePct}% did not endorse “${topDriver.text}”`
      : `most notably, ${topDriver.favourablePct}% endorsed “${topDriver.text}”`
    : "no single item dominates the result";

  const observation = `The data shows ${label} scored ${score}/100 (${LEVEL_LABEL[level]}), based on ${dimResponseCount} responses.`;

  let interpretation: string;
  if (level === "critical") {
    interpretation = `The pattern is consistent with ${label} being a live and acute source of strain — ${driverPhrase}.`;
  } else if (level === "high") {
    interpretation = `The pattern is consistent with ${label} being a material source of strain that is likely already affecting performance and retention — ${driverPhrase}.`;
  } else if (level === "watch") {
    interpretation = `The pattern is consistent with early strain in ${label} — ${driverPhrase}. It is holding up for now but worth watching.`;
  } else {
    interpretation = `The pattern is consistent with ${label} being a genuine strength — ${driverPhrase}.`;
  }
  if (clauses.length && atRisk) interpretation += ` In context, ${clauses[0]}.`;

  const rootCauseHypotheses: string[] = [];
  const alternativeExplanations: string[] = [];
  const validationQuestions = [...DIM_VALIDATION[dimension]];
  if (atRisk) {
    let h = `A plausible contributing factor is that ${DIM_HYPOTHESIS[dimension]}.`;
    if (clauses.length)
      h += ` This should be weighed against the current context, where ${clauses.join("; ")}.`;
    h += " This should be validated through focus groups before any firm conclusion.";
    rootCauseHypotheses.push(h);
    alternativeExplanations.push(
      `Alternatively, ${BASE_ALTERNATIVES[0]}.`,
      `It is also possible that ${BASE_ALTERNATIVES[1]}.`,
    );
  }

  const businessImplications: string[] = [];
  const employeeImplications: string[] = [];
  if (atRisk) {
    businessImplications.push(BUSINESS_IMPACT[dimension]);
    if (hasCostFigures)
      businessImplications.push(
        "This risk pathway is reflected in this audit's financial-impact estimate.",
      );
    employeeImplications.push(DIM_EMPLOYEE_IMPLICATION[dimension]);
  } else {
    businessImplications.push(
      "This is a protective factor that can be relied on while weaker areas are addressed.",
    );
    employeeImplications.push(
      "People report this is working — worth understanding and protecting what sustains it.",
    );
  }

  const limitations = [
    CAUSATION_DISCLAIMER,
    `Based on ${dimResponseCount} responses at ${confidence} confidence.`,
  ];
  if (segments.reported.length === 0)
    limitations.push(
      "No department breakdown is available yet — not enough responses per segment.",
    );

  return {
    findingId,
    title: `${label} — ${LEVEL_LABEL[level]}`,
    dimension,
    factorIds,
    overallScore: score,
    riskLevel: level,
    confidence,
    responseCount: dimResponseCount,
    evidence: {
      itemDrivers,
      responseDistributions,
      groupDifferences,
      openTextThemes: [],
      operationalMetrics: [],
    },
    observation,
    interpretation,
    rootCauseHypotheses,
    alternativeExplanations,
    businessImplications,
    employeeImplications,
    validationQuestions,
    limitations,
    priorityScore: 0,
  };
}

/** A Finding for every dimension, worst risk first. */
export function buildFindings(input: {
  responses: SurveyResponse[];
  dataQuality: DataQuality;
  contextSignals: ContextSignals;
  reportingThreshold: number;
  hasCostFigures?: boolean;
}): Finding[] {
  const segments = segmentScores(input.responses, input.reportingThreshold);
  const findings = DIMENSIONS.map((d) =>
    buildFinding(d, {
      responses: input.responses,
      dataQuality: input.dataQuality,
      contextSignals: input.contextSignals,
      segments,
      hasCostFigures: input.hasCostFigures ?? false,
    }),
  );
  const rank: Record<FactorRiskLevel | "none", number> = {
    critical: 0,
    high: 1,
    watch: 2,
    healthy: 3,
    none: 4,
  };
  return findings.sort(
    (a, b) => rank[a.riskLevel ?? "none"] - rank[b.riskLevel ?? "none"],
  );
}
