import type { ImplementationRisk, RaciTemplate } from "@/lib/interventions/schema";
import {
  selectInterventions,
  type SelectedIntervention,
} from "@/lib/interventions/select";
import type { Finding } from "@/lib/interpretation";
import type { PatternFinding } from "@/lib/patterns";
import type { ContextSignals } from "@/lib/context";

/**
 * PLAYBOOK GENERATION & 30-60-90 ROADMAP (Phase 5C).
 *
 * Turns selected interventions into full, executable playbooks and composes them
 * into a phased roadmap. Sequencing follows dependency logic — prerequisites in
 * the first window, dependents later (validation before redesign; redesign
 * before training managers on the redesigned process). Pure and deterministic.
 */

export interface PlaybookStep {
  stepNumber: number;
  title: string;
  purpose: string;
  actions: string[];
  owner: string;
  deadline: string;
  resources: string[];
  deliverables: string[];
  risks: string[];
  evidenceOfCompletion: string;
  successMeasure: string;
}

export interface Playbook {
  interventionId: string;
  title: string;
  level: string;
  problemAddressed: string;
  intendedOutcomes: string[];
  rationale: string;
  ownership: RaciTemplate;
  steps: PlaybookStep[];
  requiredResources: string[];
  deliverables: string[];
  timeline: string;
  leadingIndicators: string[];
  laggingIndicators: string[];
  implementationRisks: ImplementationRisk[];
  reviewDecisionMenu: string[];
  dependencyExplanation?: string;
}

export interface RoadmapWindow {
  window: string;
  items: string[];
}

export interface InterventionPlan {
  items: SelectedIntervention[];
  playbooks: Playbook[];
  roadmap: RoadmapWindow[];
  notes: string[];
}

const REVIEW_MENU = [
  "Continue as planned",
  "Expand",
  "Adjust",
  "Stop",
  "Investigate further",
];

export function generatePlaybook(sel: SelectedIntervention): Playbook {
  const iv = sel.intervention;
  let cursorDays = 0;
  const steps: PlaybookStep[] = iv.implementationSteps.map((s, idx) => {
    cursorDays += s.durationDays;
    const week = Math.max(1, Math.ceil(cursorDays / 7));
    return {
      stepNumber: idx + 1,
      title: s.title,
      purpose: s.purpose,
      actions: s.actions,
      owner: s.ownerRole,
      deadline: `by week ${week}`,
      resources: iv.requiredResources,
      deliverables: s.deliverables,
      risks: iv.implementationRisks.map((r) => r.risk),
      evidenceOfCompletion: s.deliverables.join("; ") || s.successMeasure,
      successMeasure: s.successMeasure,
    };
  });
  return {
    interventionId: iv.interventionId,
    title: iv.title,
    level: iv.interventionLevel,
    problemAddressed: `${sel.triggeredBy.join("; ")} — ${sel.addressesHypothesis}`,
    intendedOutcomes: iv.objectives,
    rationale: sel.whyChosen,
    ownership: iv.raciTemplate,
    steps,
    requiredResources: iv.requiredResources,
    deliverables: iv.implementationSteps.flatMap((s) => s.deliverables),
    timeline: iv.timelineTemplate,
    leadingIndicators: iv.leadingIndicators,
    laggingIndicators: iv.laggingIndicators,
    implementationRisks: iv.implementationRisks,
    reviewDecisionMenu: REVIEW_MENU,
    dependencyExplanation: sel.dependencyExplanation,
  };
}

export function buildRoadmap(items: SelectedIntervention[]): RoadmapWindow[] {
  const noDep = items.filter((i) => i.sequenceAfter.length === 0);
  const withDep = items.filter((i) => i.sequenceAfter.length > 0);

  const w1 = [
    "Communicate the aggregate findings openly to staff and leadership.",
    "Run validation focus groups on the priority findings before finalising the plan.",
    "Assign a named accountable owner to each priority.",
    ...noDep.map(
      (it) =>
        `Begin: ${it.intervention.title} (accountable: ${it.intervention.raciTemplate.accountable}).`,
    ),
  ];

  const w2 =
    withDep.length > 0
      ? withDep.map(
          (it) =>
            `Once its prerequisites are stable, start: ${it.intervention.title} (accountable: ${it.intervention.raciTemplate.accountable}).`,
        )
      : ["Pilot and refine the changes begun in the first 30 days."];

  return [
    { window: "Days 1–30 · Validate & stabilise", items: w1 },
    { window: "Days 31–60 · Redesign, pilot & train", items: w2 },
    {
      window: "Days 61–90 · Embed & re-measure",
      items: [
        "Embed the changes as standing norms, not one-off events.",
        "Run a targeted 90-day pulse on the factors addressed.",
        "Report the change — score movement and modelled cost avoided — to leadership.",
      ],
    },
    {
      window: "Beyond 90 · Sustain & reassess",
      items: [
        "Sustain the changes and keep ownership live.",
        "Re-run the full audit at 6 months to confirm movement and catch drift.",
      ],
    },
  ];
}

export function buildInterventionPlan(input: {
  findings: Finding[];
  patterns: PatternFinding[];
  contextSignals: ContextSignals;
}): InterventionPlan {
  const selection = selectInterventions(input);
  const playbooks = selection.items
    .filter((i) => i.isPrimaryResponse)
    .map(generatePlaybook);
  const roadmap = buildRoadmap(selection.items);
  return { items: selection.items, playbooks, roadmap, notes: selection.notes };
}
