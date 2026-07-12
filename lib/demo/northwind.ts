import type { AuditScores, RankedDimension } from "@/lib/scores-service";
import type { AuditAnnotation } from "@/lib/annotations";
import type { AdjustedCostBreakdown } from "@/lib/costModel";
import type { BenchmarkResult, PercentileDistribution } from "@/lib/benchmark";
import type { Dimension, LikertAnswer, SurveyResponse } from "@/types";
import { QUESTIONS } from "@/content/questions";
import {
  combinedInsights,
  dimensionScores,
  overallScore,
  riskBand,
  segmentScores,
} from "@/lib/scoring";
import { computeDataQuality } from "@/lib/dataQuality";
import { benchmarkResult } from "@/lib/benchmark";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
import { DIMENSIONS } from "@/lib/constants";

/**
 * Deterministic demo dataset for "Northwind Software" (90-person SaaS), computed
 * through the REAL engines from generated raw 1–5 survey answers. Used by the
 * /sample dashboard AND the exported PDFs so on-screen and document figures
 * always agree. The only thing seeded is the raw survey data.
 */
export interface NorthwindDemo {
  scores: AuditScores;
  benchmarks: Record<Dimension, BenchmarkResult | null>;
  cost: AdjustedCostBreakdown;
  annotation: AuditAnnotation;
}

// Seeded RNG (LCG) → reproducible output on every render/run.
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const TARGET: Record<Dimension, number> = {
  capacity: 41,
  clarity: 63,
  control: 58,
  connection: 44,
  confidence: 52,
};
const SEGMENT_BIAS: Record<string, number> = {
  Engineering: -11,
  Sales: 8,
  "Customer Success": 1,
  Product: -3,
  Leadership: 2,
};
const ROSTER: [string | null, number][] = [
  ["Engineering", 14],
  ["Sales", 9],
  ["Customer Success", 6],
  ["Product", 4], // < 5 → suppressed
  ["Leadership", 3], // < 5 → suppressed
  [null, 4], // unsegmented
];
const SECTOR_MEAN: Record<Dimension, number> = {
  capacity: 55,
  clarity: 60,
  control: 60,
  connection: 56,
  confidence: 58,
};

function quantile(values: number[], q: number): number {
  const a = [...values].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos);
  return Math.round(a[lo] + (a[Math.ceil(pos)] - a[lo]) * (pos - lo));
}

let cached: NorthwindDemo | null = null;

export function getNorthwindDemo(): NorthwindDemo {
  if (cached) return cached;

  const rng = makeRng(42);
  const noise = (spread: number) => (rng() * 2 - 1) * spread;

  // ── Generate raw responses ──
  const responses: SurveyResponse[] = [];
  for (const [segment, count] of ROSTER) {
    const bias = segment ? (SEGMENT_BIAS[segment] ?? 0) : 0;
    for (let i = 0; i < count; i++) {
      const answers: Record<number, LikertAnswer> = {};
      for (const q of QUESTIONS) {
        if (rng() < 0.05) {
          answers[q.id] = null; // ~5% skip → exercises null handling
          continue;
        }
        const v = clamp(TARGET[q.dimension] + bias + noise(14), 0, 100);
        const raw = q.reverse ? 5 - v / 25 : v / 25 + 1;
        answers[q.id] = clamp(Math.round(raw), 1, 5) as LikertAnswer;
      }
      responses.push({ segment, answers });
    }
  }

  // ── Real scoring engine ──
  const dimensions = dimensionScores(responses);
  const overall = overallScore(responses);
  const ranked: RankedDimension[] = DIMENSIONS.map((d) => ({
    dimension: d,
    score: dimensions[d] as number,
  }))
    .filter((x): x is RankedDimension => x.score !== null)
    .map((x) => ({ ...x, band: riskBand(x.score) }))
    .sort((a, b) => b.score - a.score);
  const segments = segmentScores(responses);
  const concentratedSegment =
    segments.reported
      .filter((s) => s.segment && s.overall !== null)
      .sort((a, b) => (a.overall as number) - (b.overall as number))[0]
      ?.segment ?? null;
  const dataQuality = computeDataQuality(responses, { reportingThreshold: 5 });

  const scores: AuditScores = {
    audit: {
      id: "northwind-q3",
      title: "Q3 Wellbeing Audit",
      orgName: "Northwind Software",
      sector: "SaaS / Software",
      sizeBand: "50-199",
      status: "open",
      public_token: "northwind-demo-token",
      created_at: new Date("2026-06-01").toISOString(),
      segments: ["Engineering", "Sales", "Customer Success", "Product", "Leadership"],
    },
    sufficient: true,
    responseCount: responses.length,
    overall,
    band: overall === null ? null : riskBand(overall),
    dimensions,
    ranked,
    insights: combinedInsights(dimensions),
    segments,
    concentratedSegment,
    dataQuality,
    reportingThreshold: dataQuality.reportingThreshold,
    findings: [],
    patterns: [],
    prioritisation: { items: [], safeguardingCount: 0, summary: "" },
    interventionPlan: { items: [], playbooks: [], roadmap: [], notes: [] },
    validationGuides: [],
    pulses: [],
  };

  // ── Real benchmark engine (14-org SaaS / 50–199 pool) ──
  const benchmarks = DIMENSIONS.reduce(
    (acc, d) => {
      const peers = Array.from({ length: 14 }, () =>
        clamp(SECTOR_MEAN[d] + noise(18), 0, 100),
      );
      const dist: PercentileDistribution = {
        p10: quantile(peers, 0.1),
        p25: quantile(peers, 0.25),
        p50: quantile(peers, 0.5),
        p75: quantile(peers, 0.75),
        p90: quantile(peers, 0.9),
      };
      acc[d] = benchmarkResult(dimensions[d] as number, dist, 14);
      return acc;
    },
    {} as Record<Dimension, BenchmarkResult | null>,
  );

  // ── Real cost loop ──
  const cost = auditAdjustedCost(
    representativeBaseInputs("50-199", "GBP"),
    dimensions,
    { concentratedSegment },
  );

  const annotation: AuditAnnotation = {
    executiveSummaryNote:
      "The Capacity and Connection gaps concentrate in Engineering, tracking the two senior departures and the Q2 release crunch. Treat this as a workload-and-support problem, not a perks problem — protect recovery time and coach the new EMs before adding headcount.",
    dimensionNotes: {
      capacity:
        "Engineering has been on a release sprint for nine weeks; protect recovery time before anything else.",
      connection:
        "Re-establish manager 1:1 cadence after the two senior departures.",
    },
  };

  cached = { scores, benchmarks, cost, annotation };
  return cached;
}
