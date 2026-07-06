import type { DimensionScores, SegmentScoresResult } from "@/types";
import { DIMENSIONS } from "@/lib/constants";
import { factorRiskLevel } from "@/lib/factors";
import type { ContextSignals } from "@/lib/context";
import type { ConfidenceLevel, DataQuality } from "@/lib/dataQuality";
import { CAUSATION_DISCLAIMER } from "@/lib/interpretation";

/**
 * ROOT-CAUSE & INTERACTION ENGINE (Phase 3B) — configurable cross-factor rules.
 *
 * Each rule is trigger → interpretation → preferred-intervention-CLASS (not a
 * full playbook; that's Phase 5). Deterministic and pure. Non-negotiables:
 *   • Outcome factors (exhaustion, belonging, intent-to-stay) are used only as
 *     SIGNALS — the preferred intervention class always targets the work-design
 *     cause, never the outcome.
 *   • Observation vs interpretation vs hypothesis are separated; interpretations
 *     use "consistent with", hypotheses are hedged, causation is never claimed.
 *   • Rules that need a signal the Core 25 can't supply either fire only when
 *     CONTEXT provides it, or carry a proxyNote — they never fabricate a signal.
 */

export type PatternSeverity = "watch" | "high" | "critical";

export interface PatternFinding {
  patternId: string;
  title: string;
  factorIds: string[];
  severity: PatternSeverity;
  confidence: ConfidenceLevel;
  observation: string;
  interpretation: string;
  rootCauseHypotheses: string[];
  alternativeExplanations: string[];
  validationQuestions: string[];
  preferredInterventionClass: string;
  limitations: string[];
  /** Present when the rule leans on a proxy or context rather than a direct item. */
  proxyNote?: string;
}

export interface PatternInput {
  factorScores: Record<string, number | null>;
  dimensionScores: DimensionScores;
  contextSignals: ContextSignals;
  dataQuality: DataQuality;
  segments: SegmentScoresResult;
}

const LOW = 55; // a factor below this is "at risk" (high/critical territory)
const HIGH = 70; // a factor at/above this is genuinely strong

const lo = (i: PatternInput, id: string): boolean => {
  const s = i.factorScores[id];
  return s !== null && s !== undefined && s < LOW;
};
const hi = (i: PatternInput, id: string): boolean => {
  const s = i.factorScores[id];
  return s !== null && s !== undefined && s >= HIGH;
};
const adequate = (i: PatternInput, id: string): boolean => {
  const s = i.factorScores[id];
  return s !== null && s !== undefined && s >= LOW;
};

function severityOf(i: PatternInput, ids: string[]): PatternSeverity {
  let worst: PatternSeverity = "watch";
  for (const id of ids) {
    const s = i.factorScores[id];
    if (s === null || s === undefined) continue;
    const level = factorRiskLevel(s);
    if (level === "critical") return "critical";
    if (level === "high") worst = "high";
  }
  return worst;
}

type Base = Omit<PatternFinding, "confidence" | "limitations">;

function mk(i: PatternInput, base: Base): PatternFinding {
  return {
    ...base,
    confidence: i.dataQuality.confidence,
    limitations: [
      CAUSATION_DISCLAIMER,
      `Cross-factor pattern read from ${i.dataQuality.completed} responses at ${i.dataQuality.confidence} confidence.`,
    ],
  };
}

// ── The rules ─────────────────────────────────────────────────────────────────

function demandControl(i: PatternInput): PatternFinding | null {
  if (!(lo(i, "capacity-workload") && (lo(i, "control-autonomy") || lo(i, "control-decision-involvement"))))
    return null;
  const factorIds = ["capacity-workload", "control-autonomy", "control-decision-involvement"];
  return mk(i, {
    patternId: "demand-control",
    title: "High demands with low control",
    factorIds,
    severity: severityOf(i, factorIds),
    observation:
      "The data shows workload demands are high while control over how work is done is low.",
    interpretation:
      "The pattern is consistent with pressure that people have little ability to adapt to — a well-documented strain combination.",
    rootCauseHypotheses: [
      "A plausible contributing factor is that decision latitude has not kept pace with demand. This should be validated through focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, both may stem from a single team or process rather than being organisation-wide.",
    ],
    validationQuestions: [
      "Where could decision rights be pushed closer to the work without adding risk?",
      "Which demands are genuinely fixed, and which are negotiable?",
    ],
    preferredInterventionClass:
      "Work redesign — rebalance demand and widen control (primary).",
  });
}

function burnoutPathway(i: PatternInput): PatternFinding | null {
  if (
    !(
      lo(i, "capacity-workload") &&
      lo(i, "capacity-recovery") &&
      lo(i, "connection-manager-support") &&
      lo(i, "capacity-exhaustion")
    )
  )
    return null;
  const factorIds = [
    "capacity-workload",
    "capacity-recovery",
    "connection-manager-support",
    "capacity-exhaustion",
  ];
  return mk(i, {
    patternId: "burnout-pathway",
    title: "Sustained-energy (burnout) pathway",
    factorIds,
    severity: severityOf(i, factorIds),
    observation:
      "The data shows high workload, low recovery, and low manager support occurring alongside high reported exhaustion.",
    interpretation:
      "The pattern is consistent with a sustained-energy pathway, where demand outstrips recovery and support.",
    rootCauseHypotheses: [
      "A plausible contributing factor is that the pace has been sustained without adequate recovery or buffering support. Exhaustion is read here as a signal of that load, not a target in itself. This should be validated through focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, a recent intense period rather than a steady state may be driving the exhaustion signal.",
    ],
    validationQuestions: [
      "Which teams carry the most sustained load, and what buffering support exists?",
      "Where has recovery time been quietly eroded?",
    ],
    preferredInterventionClass:
      "Workload and recovery redesign plus manager capacity (primary). Exhaustion is an outcome — address the work-design drivers, not the symptom.",
  });
}

function unsustainableCommitment(i: PatternInput): PatternFinding | null {
  const engagementProxy = hi(i, "connection-belonging") || hi(i, "confidence-future");
  if (!(engagementProxy && lo(i, "capacity-exhaustion") && lo(i, "capacity-recovery")))
    return null;
  const factorIds = [
    "connection-belonging",
    "confidence-future",
    "capacity-exhaustion",
    "capacity-recovery",
  ];
  return mk(i, {
    patternId: "unsustainable-commitment",
    title: "Performance sustained through overextension",
    factorIds,
    severity: severityOf(i, ["capacity-exhaustion", "capacity-recovery"]),
    observation:
      "The data shows high commitment/belonging alongside high exhaustion and low recovery.",
    interpretation:
      "The pattern is consistent with performance being sustained through overextension — committed people running hot.",
    rootCauseHypotheses: [
      "A plausible contributing factor is that engagement is masking an unsustainable load. This should be validated through focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, a temporary push toward a deadline may explain the exhaustion without a structural cause.",
    ],
    validationQuestions: [
      "Who is absorbing the most load, and what happens if they step back?",
      "Where is discretionary effort quietly propping up the operation?",
    ],
    preferredInterventionClass:
      "Protect recovery and reduce load (primary). Do NOT respond with engagement or morale activities — the risk is over-commitment, not disengagement.",
    proxyNote:
      "Engagement/meaning is proxied via belonging and intent-to-stay; the Extended survey adds a dedicated measure.",
  });
}

function silenceRisk(i: PatternInput): PatternFinding | null {
  if (
    !(
      lo(i, "confidence-psych-safety") &&
      hi(i, "connection-civility") &&
      lo(i, "control-decision-involvement")
    )
  )
    return null;
  const factorIds = [
    "confidence-psych-safety",
    "connection-civility",
    "control-decision-involvement",
  ];
  return mk(i, {
    patternId: "silence-risk",
    title: "Low conflict may be silence, not health",
    factorIds,
    severity: severityOf(i, ["confidence-psych-safety", "control-decision-involvement"]),
    observation:
      "The data shows low psychological safety and low voice, while reported conflict is low.",
    interpretation:
      "The pattern is consistent with silence rather than harmony — low conflict where safety is low may reflect fear of speaking up, not its absence.",
    rootCauseHypotheses: [
      "A plausible contributing factor is that people do not yet feel safe surfacing disagreement. This should be validated through focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, the team may genuinely be aligned; only consultation can distinguish the two.",
    ],
    validationQuestions: [
      "What happens, in practice, when someone disagrees with a decision here?",
      "When was the last time a concern changed a course of action?",
    ],
    preferredInterventionClass:
      "Psychological safety practices — blameless review and speak-up channels (primary).",
  });
}

function managerBottleneck(i: PatternInput): PatternFinding | null {
  if (!((lo(i, "clarity-role") || lo(i, "clarity-priorities")) && lo(i, "connection-manager-support")))
    return null;
  const factorIds = ["clarity-role", "clarity-priorities", "connection-manager-support"];
  return mk(i, {
    patternId: "manager-bottleneck",
    title: "Structural clarity gap, not manager capability",
    factorIds,
    severity: severityOf(i, factorIds),
    observation:
      "The data shows low role/priority clarity together with low manager support.",
    interpretation:
      "The pattern is consistent with a structural clarification gap — managers absorbing ambiguity rather than a manager-capability problem.",
    rootCauseHypotheses: [
      "A plausible contributing factor is that decision rights and priorities are unclear, leaving managers as the bottleneck. This should be validated through focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, a specific manager or team may account for the signal rather than the structure.",
    ],
    validationQuestions: [
      "Where do decisions stall waiting for a manager who lacks the authority or time?",
      "Which priorities lack a single accountable owner?",
    ],
    preferredInterventionClass:
      "Role & decision-rights mapping (RACI) before manager training (primary).",
    proxyNote:
      "Manager overload is inferred from low support plus low clarity; a manager capacity review and the Extended survey sharpen this.",
  });
}

function capacityMismatch(i: PatternInput): PatternFinding | null {
  const context = i.contextSignals.rapidGrowth || i.contextSignals.workforceContraction;
  if (!(lo(i, "capacity-workload") && adequate(i, "clarity-priorities") && context))
    return null;
  const driver = i.contextSignals.rapidGrowth
    ? "rapid growth"
    : "recent workforce contraction";
  const factorIds = ["capacity-workload", "clarity-priorities"];
  return mk(i, {
    patternId: "capacity-mismatch",
    title: "A capacity shortfall, not a prioritisation problem",
    factorIds,
    severity: severityOf(i, ["capacity-workload"]),
    observation: `The data shows high workload while priorities are reasonably clear, in a reported context of ${driver}.`,
    interpretation:
      "The pattern is consistent with a capacity (staffing) shortfall rather than a prioritisation problem.",
    rootCauseHypotheses: [
      "A plausible contributing factor is that headcount or resourcing has not kept pace with demand. This should be validated with staffing data and focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, a short-term surge rather than a structural gap may explain the load.",
    ],
    validationQuestions: [
      "How has headcount tracked against workload over the last few quarters?",
      "Which roles are unfilled or stretched across too many remits?",
    ],
    preferredInterventionClass:
      "Capacity / staffing analysis (primary) — prioritisation alone will not resolve it.",
    proxyNote:
      "Staffing adequacy is inferred from context; confirm with headcount and vacancy data.",
  });
}

function priorityGovernance(i: PatternInput): PatternFinding | null {
  if (!(lo(i, "capacity-workload") && lo(i, "clarity-priorities"))) return null;
  const factorIds = ["capacity-workload", "clarity-priorities"];
  return mk(i, {
    patternId: "priority-governance",
    title: "Priority-governance gap",
    factorIds,
    severity: severityOf(i, factorIds),
    observation: "The data shows high workload alongside low priority clarity.",
    interpretation:
      "The pattern is consistent with a priority-governance gap — too much work and shifting priorities rather than a pure staffing issue.",
    rootCauseHypotheses: [
      "A plausible contributing factor is weak intake and prioritisation, so demand is neither filtered nor sequenced. This should be validated through focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, genuine understaffing may sit underneath the prioritisation signal.",
    ],
    validationQuestions: [
      "Who can say no to incoming work, and against what criteria?",
      "How often do priorities change mid-cycle, and why?",
    ],
    preferredInterventionClass:
      "Priority governance / intake redesign — a priority ceiling and stop-work protocol (primary).",
  });
}

function unequalExperience(i: PatternInput): PatternFinding | null {
  const dims = DIMENSIONS.map((d) => i.dimensionScores[d]).filter(
    (v): v is number => v !== null,
  );
  if (dims.length === 0) return null;
  const auditOverall = Math.round(dims.reduce((a, b) => a + b, 0) / dims.length);
  const named = i.segments.reported.filter(
    (s): s is typeof s & { segment: string; overall: number } =>
      s.segment !== null && s.overall !== null,
  );
  if (named.length === 0) return null;
  const lowest = named.reduce((m, s) => (s.overall < m.overall ? s : m));
  if (!(auditOverall >= 65 && lowest.overall <= auditOverall - 15)) return null;
  return mk(i, {
    patternId: "unequal-experience",
    title: "A healthy average concealing an unequal experience",
    factorIds: [],
    severity: lowest.overall < 40 ? "critical" : "high",
    observation: `The data shows a healthy organisation-wide average (${auditOverall}), but ${lowest.segment} scores ${lowest.overall} — a gap of ${auditOverall - lowest.overall} points.`,
    interpretation:
      "The pattern is consistent with the average concealing very different experiences across teams — this is not a uniformly healthy organisation.",
    rootCauseHypotheses: [
      `A plausible contributing factor is a localised issue in ${lowest.segment}. This should be validated with that team directly.`,
    ],
    alternativeExplanations: [
      "Alternatively, a small number of responses in that team may exaggerate the gap.",
    ],
    validationQuestions: [
      `What is specifically different about ${lowest.segment}'s workload, management, or recent history?`,
    ],
    preferredInterventionClass: `Targeted, segment-specific action for ${lowest.segment} (primary) — an org-wide programme would miss it.`,
  });
}

function wellbeingWashing(i: PatternInput): PatternFinding | null {
  if (
    !(
      i.contextSignals.wellbeingProgrammePresent &&
      lo(i, "capacity-workload") &&
      lo(i, "capacity-recovery")
    )
  )
    return null;
  const factorIds = ["capacity-workload", "capacity-recovery"];
  return mk(i, {
    patternId: "wellbeing-washing",
    title: "Wellbeing benefits without work-design controls",
    factorIds,
    severity: severityOf(i, factorIds),
    observation:
      "The data shows high workload and low recovery, while a wellbeing programme is already in place (per context).",
    interpretation:
      "The pattern is consistent with wellbeing benefits sitting on top of a demanding work design — support without the underlying controls.",
    rootCauseHypotheses: [
      "A plausible contributing factor is that individual wellbeing provision has not been matched by work-design changes. This should be validated through focus groups.",
    ],
    alternativeExplanations: [
      "Alternatively, the programme may be new and not yet reflected in workload.",
    ],
    validationQuestions: [
      "Which work-design controls (workload limits, recovery norms) exist alongside the wellbeing benefits?",
      "Do people have the time and permission to use the wellbeing provision?",
    ],
    preferredInterventionClass:
      "Work-design controls on workload and recovery (primary) — individual wellness must NOT be the primary response to overload.",
  });
}

const RULES: ((i: PatternInput) => PatternFinding | null)[] = [
  demandControl,
  burnoutPathway,
  unsustainableCommitment,
  silenceRisk,
  managerBottleneck,
  capacityMismatch,
  priorityGovernance,
  unequalExperience,
  wellbeingWashing,
];

/** Evaluate every cross-factor rule; return the combined-risk findings that fired,
 *  most severe first. */
export function evaluatePatterns(input: PatternInput): PatternFinding[] {
  const rank: Record<PatternSeverity, number> = { critical: 0, high: 1, watch: 2 };
  return RULES.map((r) => r(input))
    .filter((x): x is PatternFinding => x !== null)
    .sort((a, b) => rank[a.severity] - rank[b.severity]);
}
