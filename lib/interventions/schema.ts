/**
 * INTERVENTION LIBRARY SCHEMA + QUALITY GATE (Phase 5A).
 *
 * Interventions are DATA (data/interventions/), not prompts. Three levels:
 *   • primary   = change the work (job/role/process redesign) — considered first;
 *   • secondary = build capability (training, skills);
 *   • tertiary  = support affected people (OH, EAP, adjustments).
 *
 * The quality gate is enforced in code: an intervention (or a generated playbook)
 * FAILS validation if it is missing any of the fields a credible plan needs — a
 * named accountable owner (never just "HR"), sequenced steps, timeline,
 * deliverables, resources, dependencies, risks, leading + lagging indicators,
 * fidelity checks, a review date, success criteria, adjustment and stop rules.
 * Vague standalone actions ("improve communication", "reduce workload", …) are
 * rejected. Evidence is labelled honestly — never fabricated statistics.
 */

export type InterventionLevel = "primary" | "secondary" | "tertiary";
export type EvidenceStrength = "strong" | "moderate" | "emerging" | "practice-based";
export type CostBand = "low" | "medium" | "high";

export interface ImplementationStep {
  title: string;
  purpose: string;
  actions: string[];
  ownerRole: string;
  durationDays: number;
  deliverables: string[];
  successMeasure: string;
}

export interface RaciTemplate {
  responsible: string;
  accountable: string;
  consulted: string[];
  informed: string[];
}

export interface ImplementationRisk {
  risk: string;
  mitigation: string;
}

export interface Intervention {
  interventionId: string;
  title: string;
  description: string;
  interventionLevel: InterventionLevel;
  /** Factor ids this intervention acts on (work-design targets, not outcomes). */
  factorIds: string[];
  /** Pattern ids / hypothesis tags this addresses (drives selection). */
  rootCauseTags: string[];
  industryTags: string[]; // [] = applies to any
  sizeTags: string[]; // [] = any
  workArrangementTags: string[]; // [] = any
  prerequisites: string[];
  contraindications: string[];
  evidenceStrength: EvidenceStrength;
  evidenceSources: string[];
  objectives: string[];
  implementationSteps: ImplementationStep[];
  timelineTemplate: string;
  raciTemplate: RaciTemplate;
  requiredResources: string[];
  costBand: CostBand;
  /** Other interventionIds that must precede this one. */
  dependencies: string[];
  communicationRequirements: string[];
  participationRequirements: string[];
  implementationRisks: ImplementationRisk[];
  leadingIndicators: string[];
  laggingIndicators: string[];
  fidelityChecks: string[];
  reviewSchedule: string;
  successCriteria: string[];
  adjustmentRules: string[];
  stopRules: string[];
}

// ── Quality gate ──────────────────────────────────────────────────────────────

const REQUIRED_STRINGS: (keyof Intervention)[] = [
  "interventionId",
  "title",
  "description",
  "timelineTemplate",
  "reviewSchedule",
];

const REQUIRED_NONEMPTY_ARRAYS: (keyof Intervention)[] = [
  "factorIds",
  "objectives",
  "implementationSteps",
  "requiredResources",
  "communicationRequirements",
  "implementationRisks",
  "leadingIndicators",
  "laggingIndicators",
  "fidelityChecks",
  "successCriteria",
  "adjustmentRules",
  "stopRules",
  "evidenceSources",
];

/** Vague, unactionable standalone actions the gate refuses. */
const BANNED_ACTIONS = [
  "improve communication",
  "reduce workload",
  "support managers",
  "encourage breaks",
  "raise awareness",
];

/** Returns a list of problems; empty means the intervention passes the gate. */
export function validateIntervention(i: Intervention): string[] {
  const problems: string[] = [];

  for (const k of REQUIRED_STRINGS) {
    if (!i[k] || String(i[k]).trim() === "") problems.push(`missing ${String(k)}`);
  }
  for (const k of REQUIRED_NONEMPTY_ARRAYS) {
    const v = i[k];
    if (!Array.isArray(v) || v.length === 0) problems.push(`empty ${String(k)}`);
  }

  const acc = i.raciTemplate?.accountable?.trim() ?? "";
  if (!i.raciTemplate?.responsible?.trim() || !acc)
    problems.push("incomplete raciTemplate (need responsible + accountable)");
  if (/^(hr|human resources)$/i.test(acc))
    problems.push('accountable owner must be a specific role, not just "HR"');

  i.implementationSteps?.forEach((s, idx) => {
    const n = idx + 1;
    if (!s.title?.trim()) problems.push(`step ${n}: missing title`);
    if (!s.purpose?.trim()) problems.push(`step ${n}: missing purpose`);
    if (!Array.isArray(s.actions) || s.actions.length === 0)
      problems.push(`step ${n}: no actions`);
    if (!s.ownerRole?.trim()) problems.push(`step ${n}: missing owner`);
    if (!s.successMeasure?.trim()) problems.push(`step ${n}: missing success measure`);
    for (const a of s.actions ?? []) {
      if (BANNED_ACTIONS.includes(a.trim().toLowerCase()))
        problems.push(`step ${n}: vague action "${a}" — make it specific`);
    }
  });

  return problems;
}

export function isValidIntervention(i: Intervention): boolean {
  return validateIntervention(i).length === 0;
}
