import type { Dimension, FactorRiskLevel } from "@/types";
import type { ConfidenceLevel } from "@/lib/dataQuality";
import type { ContextSignals } from "@/lib/context";
import type { Finding } from "@/lib/interpretation";
import { CAUSATION_DISCLAIMER } from "@/lib/interpretation";

/**
 * RISK PRIORITISATION ENGINE (Phase 4) — deterministic, transparent ordering.
 *
 * Priority = Severity × Exposure × BusinessImpact × HarmPotential × Confidence ×
 * Urgency × Modifiability. Feasibility/cost/readiness (from context) affect
 * SEQUENCING, not severity. The output states WHY the priorities were chosen and
 * that not everything should be tackled at once.
 *
 * SAFEGUARDING BYPASS (mandatory): any bullying/harassment/violence-pattern
 * signal skips normal prioritisation into a protected path — flagged for human
 * (consultant) review, NON-client-visible until reviewed, described
 * non-accusatorially. The Core 25 survey has no such items, so this is dormant
 * on Core data but fully implemented for the Extended survey / protected item set.
 */

/** Protected item set (arrives with the Extended survey). Absent on Core data. */
const SAFEGUARDING_FACTOR_IDS = [
  "civility-bullying",
  "civility-harassment",
  "civility-violence",
];
const SAFEGUARDING_LOW = 55;

export type PriorityClass =
  | "immediate-safeguarding"
  | "immediate-operational"
  | "strategic"
  | "developmental"
  | "monitor"
  | "insufficient-evidence";

export interface PriorityComponents {
  severity: number;
  exposure: number;
  businessImpact: number;
  harmPotential: number;
  confidence: number;
  urgency: number;
  modifiability: number;
}

export interface PrioritisedItem {
  refId: string;
  title: string;
  priorityScore: number; // 0–100, ORDINAL (ranking, not a percentage)
  classification: PriorityClass;
  rationale: string;
  feasibility: "low" | "moderate" | "high";
  requiresHumanReview: boolean;
  clientVisible: boolean;
  components: PriorityComponents;
}

export interface Prioritisation {
  items: PrioritisedItem[];
  safeguardingCount: number;
  summary: string;
}

const SEVERITY: Record<FactorRiskLevel, number> = {
  critical: 1.0,
  high: 0.75,
  watch: 0.4,
  healthy: 0.1,
};
const CONFIDENCE_W: Record<ConfidenceLevel, number> = {
  high: 1.0,
  moderate: 0.8,
  exploratory: 0.55,
  insufficient: 0.2,
};
const BUSINESS_IMPACT_W: Record<Dimension, number> = {
  capacity: 1.0,
  connection: 0.95,
  confidence: 0.8,
  clarity: 0.75,
  control: 0.7,
};
const HARM_W: Record<Dimension, number> = {
  capacity: 1.0,
  confidence: 0.9,
  connection: 0.8,
  clarity: 0.6,
  control: 0.6,
};
const MODIFIABILITY_W: Record<Dimension, number> = {
  clarity: 1.0,
  control: 0.9,
  connection: 0.8,
  capacity: 0.75,
  confidence: 0.6,
};

const CLASS_LABEL: Record<PriorityClass, string> = {
  "immediate-safeguarding": "Immediate safeguarding",
  "immediate-operational": "Immediate operational",
  strategic: "Strategic",
  developmental: "Developmental",
  monitor: "Monitor",
  "insufficient-evidence": "Insufficient evidence",
};

export function priorityClassLabel(c: PriorityClass): string {
  return CLASS_LABEL[c];
}

/** Mean unfavourable share across a finding's items — the breadth of the problem. */
function exposureOf(f: Finding): number {
  const items = f.evidence.responseDistributions;
  if (items.length === 0) return 0;
  const mean =
    items.reduce((s, d) => s + d.unfavourablePct, 0) / items.length / 100;
  return Math.min(1, Math.max(0, mean));
}

function urgencyOf(f: Finding, signals: ContextSignals): number {
  let u = f.riskLevel ? SEVERITY[f.riskLevel] : 0.1;
  if (
    signals.seasonalPeak ||
    signals.postRestructuring ||
    signals.workforceContraction
  )
    u = Math.min(1, u + 0.15);
  return u;
}

function classify(f: Finding): PriorityClass {
  if (f.confidence === "insufficient" || f.riskLevel === null)
    return "insufficient-evidence";
  if (f.riskLevel === "healthy") return "monitor";
  if (f.riskLevel === "watch") return "developmental";
  // high or critical: critical is always immediate; high is immediate when it's
  // reasonably actionable. Exploratory evidence is sequenced as strategic.
  const immediate =
    f.riskLevel === "critical" || MODIFIABILITY_W[f.dimension] >= 0.7;
  if (immediate && f.confidence !== "exploratory") return "immediate-operational";
  return "strategic";
}

export function prioritise(input: {
  findings: Finding[];
  factorScores: Record<string, number | null>;
  contextSignals: ContextSignals;
}): Prioritisation {
  const { findings, factorScores, contextSignals } = input;
  const items: PrioritisedItem[] = [];

  // ── Safeguarding bypass — protected path, never auto-shown to the client. ──
  const flagged = SAFEGUARDING_FACTOR_IDS.filter((id) => {
    const s = factorScores[id];
    return s !== null && s !== undefined && s < SAFEGUARDING_LOW;
  });
  for (const id of flagged) {
    items.push({
      refId: `safeguarding-${id}`,
      title: "Protected concern flagged for review",
      priorityScore: 100,
      classification: "immediate-safeguarding",
      rationale:
        "A pattern in the protected item set requires consultant review before it appears in any client-facing output. It must be described carefully and non-accusatorially, with appropriate signposting — it is never auto-reported.",
      feasibility: "high",
      requiresHumanReview: true,
      clientVisible: false,
      components: {
        severity: 1,
        exposure: 1,
        businessImpact: 1,
        harmPotential: 1,
        confidence: 1,
        urgency: 1,
        modifiability: 1,
      },
    });
  }

  const feasibility: "low" | "moderate" | "high" = contextSignals
    .lowImplementationReadiness
    ? "low"
    : "moderate";

  for (const f of findings) {
    const level = f.riskLevel ?? "healthy";
    const components: PriorityComponents = {
      severity: SEVERITY[level],
      exposure: exposureOf(f),
      businessImpact: BUSINESS_IMPACT_W[f.dimension],
      harmPotential: HARM_W[f.dimension],
      confidence: CONFIDENCE_W[f.confidence],
      urgency: urgencyOf(f, contextSignals),
      modifiability: MODIFIABILITY_W[f.dimension],
    };
    const product =
      components.severity *
      components.exposure *
      components.businessImpact *
      components.harmPotential *
      components.confidence *
      components.urgency *
      components.modifiability;
    const classification = classify(f);
    items.push({
      refId: f.findingId,
      title: f.title,
      priorityScore: Math.round(product * 100),
      classification,
      rationale: `Ranked for ${level} severity affecting ${Math.round(components.exposure * 100)}% unfavourably, with ${classification === "strategic" ? "high but slower-to-change" : "actionable"} impact, at ${f.confidence} confidence. Feasibility given current readiness: ${feasibility}.`,
      feasibility,
      requiresHumanReview: false,
      clientVisible: true,
      components,
    });
  }

  const rank: Record<PriorityClass, number> = {
    "immediate-safeguarding": 0,
    "immediate-operational": 1,
    strategic: 2,
    developmental: 3,
    monitor: 4,
    "insufficient-evidence": 5,
  };
  items.sort(
    (a, b) =>
      rank[a.classification] - rank[b.classification] ||
      b.priorityScore - a.priorityScore,
  );

  return {
    items,
    safeguardingCount: flagged.length,
    summary:
      "Not everything should be tackled at once. These priorities were chosen for severity, reach, business impact, confidence, and feasibility — address the immediate items first and sequence the rest. " +
      CAUSATION_DISCLAIMER,
  };
}
