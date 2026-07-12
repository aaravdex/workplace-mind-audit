import type { Dimension } from "@/types";
import type { Finding } from "@/lib/interpretation";
import type { PatternFinding } from "@/lib/patterns";

/**
 * PARTICIPATORY VALIDATION (Phase 6A, pure).
 *
 * The report's hypotheses are PRELIMINARY until validated. This generates the
 * focus-group / interview guides and operational-data requests that turn a
 * preliminary finding into a confirmed one, and defines the validation-status
 * vocabulary a consultant applies. Deterministic — no LLM.
 *
 * Storage note: a finding's validation status is set only by a consultant
 * (stored on audit_annotations, which is consultant-write / owner-read), so the
 * client can see the status but cannot set it.
 */

export type ValidationStatus =
  | "not-assessed"
  | "supported"
  | "partly-supported"
  | "not-supported"
  | "conflicting"
  | "needs-investigation";

export interface ValidationEntry {
  status: ValidationStatus;
  note?: string;
}

/** Keyed by finding/pattern refId. Stored as audit_annotations.validation_statuses. */
export type ValidationStatuses = Record<string, ValidationEntry>;

export const VALIDATION_STATUS_LABEL: Record<ValidationStatus, string> = {
  "not-assessed": "Not yet assessed",
  supported: "Supported",
  "partly-supported": "Partly supported",
  "not-supported": "Not supported",
  conflicting: "Conflicting evidence",
  "needs-investigation": "Needs investigation",
};

export interface ValidationGuide {
  refId: string;
  title: string;
  hypothesis: string;
  leadershipGuide: string[];
  managerGuide: string[];
  employeeGuide: string[];
  operationalDataRequests: string[];
}

const DIM_GUIDES: Record<
  Dimension,
  { leadership: string[]; manager: string[]; employee: string[]; data: string[] }
> = {
  capacity: {
    leadership: [
      "Where do you see the most sustained pressure, and what has driven workload up?",
      "What would you be willing to stop, defer, or resource differently?",
    ],
    manager: [
      "Which periods and tasks create the most pressure for your team?",
      "Where do you have to trade off quality against deadlines?",
    ],
    employee: [
      "Which periods or tasks create the most pressure — is it volume, urgency, complexity, or lack of resource?",
      "Who can deprioritise your work, and how quickly?",
      "Which approvals or dependencies most often delay you?",
      "If you could stop one thing, what would it be?",
    ],
    data: ["Overtime hours by team", "Vacancy and turnover by team", "Demand/volume trend over recent quarters"],
  },
  clarity: {
    leadership: ["Where do priorities most often change mid-cycle, and why?"],
    manager: ["Where does your team receive conflicting instructions?"],
    employee: [
      "When are you unsure what to focus on first?",
      "Who owns the final call when priorities conflict?",
    ],
    data: ["Rework / error rate", "Number of active priorities per team"],
  },
  control: {
    leadership: ["Where could decision rights sit closer to the work without adding risk?"],
    manager: ["Which decisions do you make that your team reasonably could?"],
    employee: [
      "Which decisions do you feel unable to make that you reasonably could?",
      "Where does oversight feel like monitoring rather than support?",
    ],
    data: ["Approval cycle times"],
  },
  connection: {
    leadership: ["What does good manager support look like here, and where is it missing?"],
    manager: ["Where do you lack the time or tools to support your team?"],
    employee: [
      "When you face difficulty, what support do you get from your manager?",
      "Is recognition experienced as fair and specific, or absent?",
    ],
    data: ["Manager span of control", "Recognition-programme usage"],
  },
  confidence: {
    leadership: ["What actually happens when someone raises a concern?"],
    manager: ["How do you respond when your team admit mistakes?"],
    employee: [
      "What actually happens when you raise a concern or admit a mistake?",
      "Where has feedback led to visible action — or not?",
    ],
    data: ["Speak-up channel usage", "Feedback-to-action closure rate"],
  },
};

/** A validation guide per priority finding and per fired pattern. */
export function buildValidationGuides(input: {
  findings: Finding[];
  patterns: PatternFinding[];
}): ValidationGuide[] {
  const guides: ValidationGuide[] = [];

  for (const f of input.findings) {
    if (f.riskLevel !== "high" && f.riskLevel !== "critical") continue;
    const g = DIM_GUIDES[f.dimension];
    guides.push({
      refId: f.findingId,
      title: f.title,
      hypothesis: f.rootCauseHypotheses[0] ?? f.interpretation,
      leadershipGuide: g.leadership,
      managerGuide: g.manager,
      employeeGuide: g.employee,
      operationalDataRequests: g.data,
    });
  }

  for (const p of input.patterns) {
    guides.push({
      refId: p.patternId,
      title: p.title,
      hypothesis: p.rootCauseHypotheses[0] ?? p.interpretation,
      leadershipGuide: [
        `Test the pattern “${p.title}” directly: does leadership recognise it, and what do they attribute it to?`,
      ],
      managerGuide: [
        "Where does this pattern show up most, and what would need to change structurally?",
      ],
      employeeGuide: p.validationQuestions,
      operationalDataRequests: [
        "Any operational metrics that would corroborate or contradict this pattern",
      ],
    });
  }

  return guides;
}
