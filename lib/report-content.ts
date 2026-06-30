import type { Dimension, RiskBand } from "@/types";
import { DIMENSION_META } from "@/lib/constants";
import type { Recommendation } from "@/lib/recommendations";
import type { AuditScores } from "@/lib/scores-service";

/** Band-based interpretation of a single dimension. */
export function interpretationFor(dimension: Dimension, band: RiskBand): string {
  const label = DIMENSION_META[dimension].label;
  switch (band) {
    case "Healthy":
      return `${label} is a clear strength — people report this is working well and it can be relied on while other areas are addressed.`;
    case "Watch":
      return `${label} is broadly holding up but shows early strain. It is worth monitoring before it slips further.`;
    case "Risk":
      return `${label} is a material risk area and is likely already affecting performance, wellbeing, and retention.`;
    case "Critical":
      return `${label} is critically low and warrants immediate, visible action from leadership.`;
  }
}

/** The business consequence of a weak dimension. */
export const BUSINESS_IMPACT: Record<Dimension, string> = {
  capacity:
    "Sustained overload shows up as sick days, reduced output, and eventually resignations — the three most expensive symptoms of burnout.",
  clarity:
    "Unclear priorities and expectations cause rework, missed deadlines, and effort spent on the wrong things.",
  control:
    "Low autonomy depresses ownership and engagement, slowing delivery and pushing your most capable people to look elsewhere.",
  connection:
    "Weak manager support and recognition accelerate disengagement and are among the strongest predictors of voluntary turnover.",
  confidence:
    "Low psychological safety suppresses ideas, early warnings, and honest problem-flagging — innovation and risk-detection both suffer.",
};

/** A short leadership-level synthesis of the whole result. */
export function leadershipInterpretation(scores: AuditScores): string {
  if (scores.overall === null || scores.ranked.length === 0) {
    return "There is not yet enough data to interpret this audit.";
  }
  const strongest = scores.ranked[0];
  const weakest = scores.ranked[scores.ranked.length - 1];
  return (
    `Your overall Workplace Mind Score is ${scores.overall} (${scores.band}). ` +
    `${DIMENSION_META[strongest.dimension].label} is your strongest dimension at ${strongest.score}, ` +
    `while ${DIMENSION_META[weakest.dimension].label} is the most pressing at ${weakest.score}. ` +
    `The fastest, most credible path to improvement is to focus visibly on ${DIMENSION_META[weakest.dimension].label} first, ` +
    `communicate that you have heard the feedback, and re-measure within 90 days to prove movement.`
  );
}

export interface PlanWindow {
  window: string;
  items: string[];
}

/** A concrete 30-day action plan derived from the recommendations. */
export function thirtyDayPlan(recs: Recommendation[]): PlanWindow[] {
  if (recs.length === 0) {
    return [
      {
        window: "Days 1–30 · Maintain",
        items: [
          "Reinforce what is working and keep protecting it.",
          "Re-run the audit next quarter to catch drift early.",
        ],
      },
    ];
  }
  const top = recs.slice(0, 2);
  return [
    {
      window: "Days 1–7 · Align",
      items: [
        "Share the aggregate results openly with leadership and teams.",
        `Name an accountable owner for the priority area: ${DIMENSION_META[top[0].dimension].label}.`,
      ],
    },
    {
      window: "Days 8–21 · Act",
      items: top.flatMap((r) => r.actions.slice(0, 2)),
    },
    {
      window: "Days 22–30 · Measure",
      items: [
        "Define two or three metrics to track (e.g. workload, eNPS, regretted turnover).",
        "Schedule a follow-up pulse in 90 days to measure movement.",
      ],
    },
  ];
}

/**
 * A phased 90-day intervention plan (Stabilise → Rebuild → Embed), conditioned
 * on the dimensions in Risk/Critical. This is the structure behind the
 * "90-Day Wellbeing Intervention" service tier.
 */
export function ninetyDayPlan(recs: Recommendation[]): PlanWindow[] {
  if (recs.length === 0) {
    return [
      {
        window: "Days 1–90 · Sustain",
        items: [
          "No dimension is in the Risk band — protect what is working.",
          "Keep manager 1:1s and recognition rituals consistent.",
          "Re-run the 5C audit next quarter to catch drift early.",
        ],
      },
    ];
  }

  const primary = recs[0];
  const secondary = recs.slice(1, 3);
  const primaryLabel = DIMENSION_META[primary.dimension].label;

  return [
    {
      window: "Days 1–30 · Stabilise",
      items: [
        "Share the aggregate findings openly and name an accountable owner per priority area.",
        `Take immediate pressure off the most acute area — ${primaryLabel}.`,
        ...primary.actions.slice(0, 2),
      ],
    },
    {
      window: "Days 31–60 · Rebuild",
      items: [
        "Equip managers: targeted coaching on the behaviours behind the weakest dimensions.",
        ...(secondary.length > 0
          ? secondary.flatMap((r) => r.actions.slice(0, 1))
          : primary.actions.slice(2, 3)),
        "Run fortnightly working sessions with the owners to remove blockers.",
      ],
    },
    {
      window: "Days 61–90 · Embed & re-measure",
      items: [
        "Turn the fixes into standing norms and rituals, not one-off events.",
        "Re-run the 5C audit and compare against this baseline to prove movement.",
        "Report the delta — score change and the modelled cost avoided — to leadership.",
      ],
    },
  ];
}
