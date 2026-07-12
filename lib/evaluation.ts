import { FACTORS_BY_ID } from "@/content/factors";
import { QUESTIONS_BY_ID } from "@/content/questions";

/**
 * IMPLEMENTATION & EVALUATION ENGINE (Phase 6A, pure).
 *
 * Pulse-survey generation, fidelity measurement, and change reporting. The key
 * idea: implementation is behaviour. A plan that was not executed has not failed
 * — it has not happened. So fidelity (was it delivered as designed?) is tracked
 * SEPARATELY from outcomes, and an outcome that did not move at low fidelity is
 * read as an implementation gap, not an ineffective intervention.
 *
 * Types here also lock the audit_actions storage schema (migration 0007).
 */

// ── Implementation tracker (locks audit_actions columns) ──────────────────────

export type ActionStatus =
  | "not-started"
  | "in-progress"
  | "at-risk"
  | "completed"
  | "completed-ineffective"
  | "deferred"
  | "cancelled";

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  "at-risk": "At risk",
  completed: "Completed",
  "completed-ineffective": "Completed but ineffective",
  deferred: "Deferred",
  cancelled: "Cancelled",
};

export interface FidelityRecord {
  started: boolean;
  deliveredToIntendedGroup: boolean;
  deliveredAsDesigned: boolean;
  managersTrained: boolean;
  processesUsed: boolean;
  resourcesProvided: boolean;
  leadershipConsistent: boolean;
  sustained: boolean;
}

export const FIDELITY_CHECKS: { key: keyof FidelityRecord; label: string }[] = [
  { key: "started", label: "Was it started?" },
  { key: "deliveredToIntendedGroup", label: "Delivered to the intended group?" },
  { key: "deliveredAsDesigned", label: "Delivered as designed?" },
  { key: "managersTrained", label: "Were managers trained?" },
  { key: "processesUsed", label: "Were the new processes actually used?" },
  { key: "resourcesProvided", label: "Were the resources provided?" },
  { key: "leadershipConsistent", label: "Was leadership behaviour consistent?" },
  { key: "sustained", label: "Was it sustained?" },
];

export interface TrackerAction {
  id: string;
  auditId: string;
  title: string;
  owner: string | null;
  deadline: string | null;
  status: ActionStatus;
  evidence: string | null;
  kpi: string | null;
  reviewDate: string | null;
  fidelity: FidelityRecord | null;
  interventionId: string | null;
  createdAt: string;
}

export function fidelityScore(f: FidelityRecord): number {
  const vals = Object.values(f);
  return vals.length ? Math.round((vals.filter(Boolean).length / vals.length) * 100) : 0;
}

/** Distinguishes an implementation gap from an ineffective intervention. */
export function interpretFidelity(
  f: FidelityRecord | null,
  outcomeMoved: boolean,
): string {
  if (!f)
    return "Fidelity has not been recorded — an implementation gap cannot yet be distinguished from an ineffective intervention.";
  const score = fidelityScore(f);
  if (outcomeMoved)
    return `The intervention is showing movement, delivered at ${score}% fidelity.`;
  if (score < 60)
    return `No score movement yet, but only ${score}% of the intervention was delivered as designed — read this as an IMPLEMENTATION gap, not evidence the intervention is ineffective.`;
  return `Delivered at ${score}% fidelity with no score movement — this warrants reconsidering the intervention itself, not just its delivery.`;
}

// ── Change reporting (statistical / practical / implementation) ────────────────

export interface ChangeReport {
  statistical: string;
  practical: string;
  implementation: string;
}

export function describeChange(input: {
  factorLabel: string;
  before: number;
  after: number;
  practicallyMeaningful: boolean;
  embedded: boolean;
  driver?: string;
  unchanged?: string;
}): ChangeReport {
  const delta = input.after - input.before;
  return {
    statistical: `${input.factorLabel} moved ${input.before}→${input.after} (${delta >= 0 ? "+" : ""}${delta}).`,
    practical: input.practicallyMeaningful
      ? `This is an operationally meaningful change${input.driver ? `, driven by ${input.driver}` : ""}.${input.unchanged ? ` However, ${input.unchanged} is unchanged.` : ""}`
      : "The change is not yet operationally meaningful.",
    implementation: input.embedded
      ? "The practices behind it appear embedded."
      : "The practices are not yet embedded — treat the movement as fragile.",
  };
}

// ── Pulse generation ──────────────────────────────────────────────────────────

export interface PulseSurvey {
  name: string;
  timing: string;
  questions: string[];
}

/** Pulses target only the factors the plan is acting on — not the whole survey. */
export function buildPulses(targetedFactorIds: string[]): PulseSurvey[] {
  const qs = new Set<string>();
  for (const fid of targetedFactorIds) {
    const f = FACTORS_BY_ID.get(fid);
    if (!f) continue;
    for (const qid of f.questionIds) {
      const q = QUESTIONS_BY_ID.get(qid);
      if (q) qs.add(q.text);
    }
  }
  const factorQuestions = [...qs];
  return [
    {
      name: "30-day implementation pulse",
      timing: "Day 30",
      questions: [
        "Are you aware of the changes being made following the audit?",
        "Do you feel leadership is genuinely responding to the issues raised?",
        "What, if anything, is getting in the way of the changes?",
      ],
    },
    {
      name: "60/90-day factor pulse",
      timing: "Day 60 and Day 90",
      questions: factorQuestions.length
        ? factorQuestions
        : ["(No targeted factors identified — re-ask the full survey.)"],
    },
    {
      name: "6-month reassessment",
      timing: "Month 6",
      questions: ["Re-run the full 5C audit and compare against this baseline."],
    },
  ];
}
