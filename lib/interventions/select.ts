import { INTERVENTIONS } from "@/data/interventions/library";
import type { Intervention, InterventionLevel } from "@/lib/interventions/schema";
import type { Finding } from "@/lib/interpretation";
import type { PatternFinding } from "@/lib/patterns";
import type { ContextSignals } from "@/lib/context";

/**
 * INTERVENTION SELECTION & TAILORING (Phase 5B).
 *
 * Maps findings + patterns → library interventions, PRIMARY-FIRST. The lead
 * response to any structural cause (overload, understaffing, unfairness, unclear
 * priorities, harassment) is ALWAYS a primary (change-the-work) intervention —
 * the engine will not promote a secondary/tertiary (training, EAP, individual
 * wellness) to primary, and flags a gap instead. Selection is tailored by
 * context signals, and dependencies are sequenced with an explanation (e.g.
 * manager training only after workload has stabilised).
 */

export interface SelectedIntervention {
  intervention: Intervention;
  /** Finding/pattern labels that triggered this selection. */
  triggeredBy: string[];
  addressesHypothesis: string;
  whyChosen: string;
  /** True only for the primary lead of a cause. */
  isPrimaryResponse: boolean;
  /** interventionIds that must precede this one. */
  sequenceAfter: string[];
  dependencyExplanation?: string;
}

export interface Selection {
  items: SelectedIntervention[];
  notes: string[];
}

const LEVEL_RANK: Record<InterventionLevel, number> = {
  primary: 0,
  secondary: 1,
  tertiary: 2,
};
const EVIDENCE_RANK: Record<Intervention["evidenceStrength"], number> = {
  strong: 0,
  moderate: 1,
  emerging: 2,
  "practice-based": 3,
};

const byId = new Map(INTERVENTIONS.map((i) => [i.interventionId, i]));

interface Cause {
  tag: string | null; // pattern id, or null for a dimension finding
  label: string;
  factorIds: string[];
  hypothesis: string;
}

function candidatesFor(cause: Cause): Intervention[] {
  return INTERVENTIONS.filter((iv) => {
    const patternMatch = cause.tag ? iv.rootCauseTags.includes(cause.tag) : false;
    const factorMatch = iv.factorIds.some((f) => cause.factorIds.includes(f));
    return patternMatch || factorMatch;
  }).sort((a, b) => {
    // Primary first, then by evidence strength.
    if (a.interventionLevel !== b.interventionLevel)
      return LEVEL_RANK[a.interventionLevel] - LEVEL_RANK[b.interventionLevel];
    return EVIDENCE_RANK[a.evidenceStrength] - EVIDENCE_RANK[b.evidenceStrength];
  });
}

export function selectInterventions(input: {
  findings: Finding[];
  patterns: PatternFinding[];
  contextSignals: ContextSignals;
}): Selection {
  const { findings, patterns, contextSignals } = input;
  const notes: string[] = [];

  // ── Gather causes: patterns (cross-factor, structural) + at-risk findings. ──
  const causes: Cause[] = [];
  for (const p of patterns) {
    causes.push({
      tag: p.patternId,
      label: p.title,
      factorIds: p.factorIds,
      hypothesis: p.rootCauseHypotheses[0] ?? p.interpretation,
    });
  }
  for (const f of findings) {
    if (f.riskLevel === "high" || f.riskLevel === "critical") {
      causes.push({
        tag: null,
        label: f.title,
        factorIds: f.factorIds,
        hypothesis: f.rootCauseHypotheses[0] ?? f.interpretation,
      });
    }
  }

  const selected = new Map<string, SelectedIntervention>();
  const add = (
    iv: Intervention,
    cause: Cause,
    isPrimaryResponse: boolean,
    why: string,
  ) => {
    const existing = selected.get(iv.interventionId);
    if (existing) {
      if (!existing.triggeredBy.includes(cause.label))
        existing.triggeredBy.push(cause.label);
      existing.isPrimaryResponse = existing.isPrimaryResponse || isPrimaryResponse;
      return;
    }
    selected.set(iv.interventionId, {
      intervention: iv,
      triggeredBy: [cause.label],
      addressesHypothesis: cause.hypothesis,
      whyChosen: why,
      isPrimaryResponse,
      sequenceAfter: [],
    });
  };

  for (const cause of causes) {
    const candidates = candidatesFor(cause);
    const primary = candidates.find((c) => c.interventionLevel === "primary");
    if (primary) {
      add(
        primary,
        cause,
        true,
        `Selected as the primary response to “${cause.label}” because it changes the work rather than the individual.`,
      );
      // Supporting secondary/tertiary — never promoted to primary.
      for (const c of candidates.filter((x) => x.interventionLevel !== "primary")) {
        add(
          c,
          cause,
          false,
          `Added as a supporting ${c.interventionLevel} intervention beneath the primary response — it supports people but does not, on its own, address the cause.`,
        );
      }
    } else if (candidates.length > 0) {
      // Only non-primary candidates exist: DO NOT promote them. Flag the gap.
      notes.push(
        `No primary (work-design) intervention is yet in the library for “${cause.label}”. A work-design response is required — expert review needed; individual-level support alone must not be the primary answer.`,
      );
      for (const c of candidates) {
        add(
          c,
          cause,
          false,
          `Added as supporting ${c.interventionLevel} support only — the primary work-design response still needs to be defined.`,
        );
      }
    } else {
      notes.push(`No library intervention yet matches “${cause.label}” — expert review required.`);
    }
  }

  // ── Context tailoring ──
  if (
    contextSignals.wellbeingProgrammePresent &&
    [...selected.values()].some((s) => s.intervention.interventionLevel === "tertiary")
  ) {
    notes.push(
      "A wellbeing programme is already present — work-design controls lead here; individual wellbeing support is explicitly subordinate, never the headline response.",
    );
  }
  if (contextSignals.rapidGrowth && byId.has("capacity-staffing-analysis")) {
    const s = selected.get("capacity-staffing-analysis");
    if (s)
      s.whyChosen +=
        " Reported rapid growth makes a staffing-capacity review especially relevant.";
  }

  // ── Dependency resolution + sequencing ──
  for (const item of [...selected.values()]) {
    for (const depId of item.intervention.dependencies) {
      const dep = byId.get(depId);
      if (!dep) continue;
      if (!selected.has(depId)) {
        // Pull in the prerequisite so the plan is coherent.
        selected.set(depId, {
          intervention: dep,
          triggeredBy: [`prerequisite for ${item.intervention.title}`],
          addressesHypothesis: item.addressesHypothesis,
          whyChosen: `Included because “${item.intervention.title}” depends on it.`,
          isPrimaryResponse: dep.interventionLevel === "primary",
          sequenceAfter: [],
        });
      }
      item.sequenceAfter.push(depId);
      item.dependencyExplanation = `Sequenced after ${dep.title} — acting on the dependent step before the foundation is stabilised would embed the current problem.`;
    }
  }

  // ── Order: dependencies before dependents, then primary before support. ──
  const items = [...selected.values()];
  const ordered: SelectedIntervention[] = [];
  const placed = new Set<string>();
  const place = (it: SelectedIntervention) => {
    if (placed.has(it.intervention.interventionId)) return;
    for (const depId of it.sequenceAfter) {
      const dep = items.find((x) => x.intervention.interventionId === depId);
      if (dep) place(dep);
    }
    placed.add(it.intervention.interventionId);
    ordered.push(it);
  };
  items
    .sort(
      (a, b) =>
        Number(b.isPrimaryResponse) - Number(a.isPrimaryResponse) ||
        LEVEL_RANK[a.intervention.interventionLevel] -
          LEVEL_RANK[b.intervention.interventionLevel],
    )
    .forEach(place);

  return { items: ordered, notes };
}
