import { z } from "zod";

/**
 * ORGANISATIONAL CONTEXT (Phase 1B).
 *
 * Completed by the client admin at/after audit creation — NEVER by employees.
 * It is org-level business context (structure, current situation, aggregated
 * indicators, existing systems, implementation readiness), NOT employee PII, and
 * is stored on the audit under the existing owner-only RLS. It is never sent to
 * the public survey path.
 *
 * Every field is optional. When critical fields are missing the system still
 * produces a plan, but `provisionalStatus` marks it PROVISIONAL, states its
 * assumptions, and lists the clarifying questions whose answers would change it.
 *
 * `contextSignals` derives interpretation-affecting flags that Phase 3 consumes:
 * the SAME scores read differently in a seasonal peak or post-restructuring than
 * in steady state. Deterministic and pure — no LLM, no I/O.
 */

const Level = z.enum(["low", "moderate", "high"]);
const pct = z.number().min(0).max(100);

export const WorkArrangement = z.enum(["onsite", "hybrid", "remote", "mixed"]);
export const GrowthStage = z.enum([
  "startup",
  "scaling",
  "steady",
  "restructuring",
  "decline",
]);
export const BudgetBand = z.enum(["none", "limited", "moderate", "significant"]);

const ProfileSchema = z.object({
  industry: z.string().trim().min(1).optional(),
  locations: z.number().int().min(0).optional(),
  headcount: z.number().int().min(0).optional(),
  departments: z.array(z.string().trim().min(1)).optional(),
  workArrangement: WorkArrangement.optional(),
  shiftPatterns: z.string().trim().optional(),
  workforceComposition: z.string().trim().optional(),
  growthStage: GrowthStage.optional(),
  safetyCritical: z.boolean().optional(),
  customerFacing: z.boolean().optional(),
  seasonality: z
    .object({
      isSeasonal: z.boolean().optional(),
      inPeakNow: z.boolean().optional(),
      note: z.string().trim().optional(),
    })
    .optional(),
});

const SituationSchema = z.object({
  restructuring: z.boolean().optional(),
  mergerAcquisition: z.boolean().optional(),
  leadershipChange: z.boolean().optional(),
  layoffsOrFreeze: z.boolean().optional(),
  rapidHiring: z.boolean().optional(),
  newTechnology: z.boolean().optional(),
  returnToOfficeChange: z.boolean().optional(),
  revenuePressure: z.boolean().optional(),
  resignationSpike: z.boolean().optional(),
  absenceSpike: z.boolean().optional(),
});

const IndicatorsSchema = z.object({
  voluntaryTurnoverPct: pct.optional(),
  absenceRatePct: pct.optional(),
  overtimeHoursPerWeek: z.number().min(0).optional(),
  vacancyRatePct: pct.optional(),
  errorReworkRatePct: pct.optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  wellbeingUtilisationPct: pct.optional(),
});

const SystemsSchema = z.object({
  hasEAP: z.boolean().optional(),
  hasOccupationalHealth: z.boolean().optional(),
  managerMentalHealthTraining: z.boolean().optional(),
  workloadReviewProcess: z.boolean().optional(),
  flexibleWorkingPolicy: z.boolean().optional(),
  changeManagementProcess: z.boolean().optional(),
  hasWellbeingProgramme: z.boolean().optional(),
});

const ReadinessSchema = z.object({
  budgetBand: BudgetBand.optional(),
  sponsorAvailability: Level.optional(),
  hrCapacity: Level.optional(),
  managerCapacity: Level.optional(),
  changeFatigue: Level.optional(),
  employeeTrust: Level.optional(),
  constraints: z.string().trim().optional(),
  previousInterventions: z.string().trim().optional(),
});

export const ContextSchema = z.object({
  profile: ProfileSchema.optional(),
  situation: SituationSchema.optional(),
  indicators: IndicatorsSchema.optional(),
  systems: SystemsSchema.optional(),
  readiness: ReadinessSchema.optional(),
});

export type AuditContext = z.infer<typeof ContextSchema>;
type Situation = z.infer<typeof SituationSchema>;

// ── Interpretation signals ────────────────────────────────────────────────────

/** Interpretation-affecting flags derived deterministically from context. */
export interface ContextSignals {
  seasonalPeak: boolean;
  postRestructuring: boolean;
  workforceContraction: boolean;
  rapidGrowth: boolean;
  rtoTransition: boolean;
  revenuePressure: boolean;
  wellbeingProgrammePresent: boolean;
  safetyCritical: boolean;
  changeSaturation: boolean;
  lowImplementationReadiness: boolean;
  /** Human-readable active disruptions, for interpretation phrasing. */
  activeDisruptions: string[];
}

const DISRUPTION_LABELS: Record<keyof Situation, string> = {
  restructuring: "restructuring",
  mergerAcquisition: "a merger or acquisition",
  leadershipChange: "a leadership change",
  layoffsOrFreeze: "layoffs or a hiring freeze",
  rapidHiring: "rapid hiring",
  newTechnology: "a major new technology rollout",
  returnToOfficeChange: "a return-to-office change",
  revenuePressure: "revenue pressure",
  resignationSpike: "a recent spike in resignations",
  absenceSpike: "a recent spike in absence",
};

export function contextSignals(
  context: AuditContext | null | undefined,
): ContextSignals {
  const c = context ?? {};
  const p = c.profile ?? {};
  const s = c.situation ?? {};
  const sys = c.systems ?? {};
  const r = c.readiness ?? {};

  const activeDisruptions = (Object.keys(DISRUPTION_LABELS) as (keyof Situation)[])
    .filter((k) => s[k] === true)
    .map((k) => DISRUPTION_LABELS[k]);

  const budgetConstrained =
    r.budgetBand === "none" || r.budgetBand === "limited";
  const capacityConstrained =
    r.sponsorAvailability === "low" ||
    r.hrCapacity === "low" ||
    r.managerCapacity === "low";

  return {
    seasonalPeak: p.seasonality?.inPeakNow === true,
    postRestructuring:
      s.restructuring === true ||
      s.leadershipChange === true ||
      s.mergerAcquisition === true,
    workforceContraction:
      s.layoffsOrFreeze === true || s.resignationSpike === true,
    rapidGrowth:
      s.rapidHiring === true ||
      p.growthStage === "scaling" ||
      p.growthStage === "startup",
    rtoTransition: s.returnToOfficeChange === true,
    revenuePressure: s.revenuePressure === true,
    wellbeingProgrammePresent: sys.hasWellbeingProgramme === true,
    safetyCritical: p.safetyCritical === true,
    changeSaturation: r.changeFatigue === "high" || activeDisruptions.length >= 3,
    lowImplementationReadiness: budgetConstrained && capacityConstrained,
    activeDisruptions,
  };
}

// ── Provisional-plan gating ───────────────────────────────────────────────────

export interface ProvisionalStatus {
  provisional: boolean;
  /** Assumptions the plan makes because a critical field is missing. */
  assumptions: string[];
  /** Questions whose answers would change the plan (paired to assumptions). */
  clarifyingQuestions: string[];
}

/**
 * A plan is PROVISIONAL when any of the critical context fields is missing.
 * Each missing field contributes one explicit assumption and one clarifying
 * question, so the report is honest about what it assumed and how to firm it up.
 */
export function provisionalStatus(
  context: AuditContext | null | undefined,
): ProvisionalStatus {
  const c = context ?? {};
  const p = c.profile ?? {};
  const s = c.situation ?? {};
  const r = c.readiness ?? {};
  const assumptions: string[] = [];
  const clarifyingQuestions: string[] = [];

  const need = (missing: boolean, assumption: string, question: string) => {
    if (missing) {
      assumptions.push(assumption);
      clarifyingQuestions.push(question);
    }
  };

  need(
    p.headcount === undefined,
    "Organisation headcount was not provided; scale-dependent framing is generic.",
    "What is the approximate headcount, and how is it split across departments?",
  );
  need(
    p.workArrangement === undefined,
    "Work arrangement (onsite/hybrid/remote) was not provided; Connection findings are read without it.",
    "Is the workforce predominantly onsite, hybrid, or remote?",
  );
  need(
    !Object.values(s).some((v) => v !== undefined),
    "No current-situation context was provided; findings assume steady state with no major disruption.",
    "Is the organisation currently undergoing restructuring, rapid growth, layoffs, an RTO change, or a seasonal peak?",
  );
  need(
    p.growthStage === undefined,
    "Growth stage was not provided; capacity findings are not adjusted for scaling.",
    "What growth stage best describes the organisation right now?",
  );
  need(
    r.budgetBand === undefined,
    "Intervention budget band was not provided; the plan does not yet reflect resource constraints.",
    "What budget band is realistically available for interventions?",
  );
  need(
    r.sponsorAvailability === undefined,
    "Executive sponsor availability was not provided; ownership assignments are provisional.",
    "Who is the executive sponsor, and how much of their time is available?",
  );

  return {
    provisional: assumptions.length > 0,
    assumptions,
    clarifyingQuestions,
  };
}
