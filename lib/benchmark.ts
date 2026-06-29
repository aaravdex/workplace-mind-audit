import { MIN_COMPANIES_PER_BENCHMARK } from "@/lib/constants";

/**
 * PURE benchmark logic: percentile + band, with the min-companies anonymity
 * guard. A "benchmark" built on too few organisations is both a privacy risk and
 * statistically meaningless, so this layer REFUSES to report below the threshold
 * (returns null) — the UI then degrades to "insufficient peer data".
 *
 * Distributions come from materialised `benchmark_snapshots`; this module never
 * touches raw responses.
 */

export type BenchmarkBand =
  | "bottom quartile"
  | "below median"
  | "above median"
  | "top quartile";

/** Score-domain percentile anchors for one sector/size/dimension cell (0–100). */
export interface PercentileDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface BenchmarkResult {
  score: number;
  /** Estimated percentile of this score within the peer distribution (0–100). */
  percentile: number;
  band: BenchmarkBand;
  nCompanies: number;
}

/** Classify a score against the peer quartiles. */
export function benchmarkBand(
  score: number,
  dist: PercentileDistribution,
): BenchmarkBand {
  if (score < dist.p25) return "bottom quartile";
  if (score < dist.p50) return "below median";
  if (score < dist.p75) return "above median";
  return "top quartile";
}

/**
 * Estimate the percentile of `score` by piecewise-linear interpolation across the
 * distribution anchors, bounded to [0, 100]. Monotonic in `score`.
 */
export function percentileOf(
  score: number,
  dist: PercentileDistribution,
): number {
  const anchors: { x: number; p: number }[] = [
    { x: 0, p: 0 },
    { x: dist.p10, p: 10 },
    { x: dist.p25, p: 25 },
    { x: dist.p50, p: 50 },
    { x: dist.p75, p: 75 },
    { x: dist.p90, p: 90 },
    { x: 100, p: 100 },
  ];

  if (score <= anchors[0].x) return 0;
  if (score >= anchors[anchors.length - 1].x) return 100;

  for (let i = 1; i < anchors.length; i++) {
    const lo = anchors[i - 1];
    const hi = anchors[i];
    if (score <= hi.x) {
      const span = hi.x - lo.x;
      if (span <= 0) return Math.round(hi.p);
      const t = (score - lo.x) / span;
      return Math.round(lo.p + t * (hi.p - lo.p));
    }
  }
  return 100;
}

/**
 * Full benchmark result, or null when the peer pool is too small to report.
 * THE GUARD: never expose a benchmark from fewer than MIN_COMPANIES_PER_BENCHMARK
 * distinct organisations.
 */
export function benchmarkResult(
  score: number,
  dist: PercentileDistribution,
  nCompanies: number,
): BenchmarkResult | null {
  if (nCompanies < MIN_COMPANIES_PER_BENCHMARK) return null;
  return {
    score,
    percentile: percentileOf(score, dist),
    band: benchmarkBand(score, dist),
    nCompanies,
  };
}
