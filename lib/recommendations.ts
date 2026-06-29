import type { Dimension, DimensionScores, RiskBand } from "@/types";
import { DIMENSIONS } from "@/lib/constants";
import { riskBand } from "@/lib/scoring";

export interface Recommendation {
  dimension: Dimension;
  score: number;
  band: RiskBand;
  title: string;
  actions: string[];
}

/** One playbook per C. Surfaced when that dimension lands in Risk/Critical. */
const PLAYBOOK: Record<Dimension, { title: string; actions: string[] }> = {
  capacity: {
    title: "Rebalance workload and protect recovery",
    actions: [
      "Map current workloads against realistic capacity and cut, automate, or resequence the lowest-value work.",
      "Set explicit recovery norms: protected focus time and no routine after-hours contact.",
      "Make sustained overtime visible to leadership and treat it as a planning failure, not heroism.",
    ],
  },
  clarity: {
    title: "Sharpen roles, priorities, and expectations",
    actions: [
      "Give every role a one-page definition of success and its top three priorities.",
      "Remove conflicting instructions by naming a single accountable owner per outcome.",
      "Run a short weekly priorities reset so people always know what comes first.",
    ],
  },
  control: {
    title: "Increase autonomy and reduce micromanagement",
    actions: [
      "Push decision rights down to the people doing the work wherever risk allows.",
      "Replace activity monitoring with outcome-based check-ins.",
      "Offer meaningful flexibility in how and when work gets done.",
    ],
  },
  connection: {
    title: "Strengthen manager support and recognition",
    actions: [
      "Train managers in supportive 1:1s and practical workload triage.",
      "Build regular, specific recognition into team rhythms.",
      "Address unresolved team conflict early with a clear, fair process.",
    ],
  },
  confidence: {
    title: "Build psychological safety and trust",
    actions: [
      "Make it visibly safe to raise concerns and admit mistakes — leaders model it first.",
      "Close the loop on employee feedback so people see action, not just surveys.",
      "Communicate honestly about direction and each person's future.",
    ],
  },
};

/**
 * Recommendations for the dimensions currently in Risk or Critical, worst-first.
 * Healthy/Watch dimensions are intentionally omitted — the report prescribes
 * where action is needed, not everywhere.
 */
export function recommendations(scores: DimensionScores): Recommendation[] {
  const out: Recommendation[] = [];
  for (const dimension of DIMENSIONS) {
    const score = scores[dimension];
    if (score === null) continue;
    const band = riskBand(score);
    if (band === "Risk" || band === "Critical") {
      out.push({
        dimension,
        score,
        band,
        title: PLAYBOOK[dimension].title,
        actions: PLAYBOOK[dimension].actions,
      });
    }
  }
  // Worst score first so the most urgent intervention leads.
  return out.sort((a, b) => a.score - b.score);
}
