import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dimension, DimensionScores, SurveyResponse } from "@/types";
import { DIMENSIONS } from "@/lib/constants";
import { dimensionScore } from "@/lib/scoring";
import {
  benchmarkResult,
  type BenchmarkResult,
  type PercentileDistribution,
} from "@/lib/benchmark";

/**
 * Benchmark materialisation + reads. The pipeline aggregates every anonymous
 * response — joined to its org's sector + size band — into per-dimension
 * percentile distributions ACROSS DISTINCT ORGANISATIONS, and writes
 * benchmark_snapshots. It NEVER stores or exposes raw responses. The min-N guard
 * lives in lib/benchmark (returns null below MIN_COMPANIES_PER_BENCHMARK) and in
 * the benchmark_snapshots RLS policy (world-readable only where n_companies>=8).
 */

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
}

function distributionFrom(scores: number[]): PercentileDistribution {
  const s = [...scores].sort((a, b) => a - b);
  return {
    p10: Math.round(quantile(s, 0.1)),
    p25: Math.round(quantile(s, 0.25)),
    p50: Math.round(quantile(s, 0.5)),
    p75: Math.round(quantile(s, 0.75)),
    p90: Math.round(quantile(s, 0.9)),
  };
}

/**
 * Recompute every benchmark cell from scratch. Each ORGANISATION contributes ONE
 * score per dimension (the mean of its own responses), so the distribution is
 * across companies, not respondents. Run via the service role (admin client).
 */
export async function materialiseBenchmarks(
  admin: SupabaseClient,
): Promise<{ cells: number }> {
  const [{ data: orgs }, { data: audits }, { data: responseRows }] =
    await Promise.all([
      admin.from("organisations").select("id, sector, size_band"),
      admin.from("audits").select("id, org_id"),
      admin.from("responses").select("audit_id, answers"),
    ]);

  const auditToOrg = new Map<string, string>();
  for (const a of audits ?? []) auditToOrg.set(a.id, a.org_id);

  const orgMeta = new Map<string, { sector: string; sizeBand: string }>();
  for (const o of orgs ?? []) {
    if (o.sector && o.size_band)
      orgMeta.set(o.id, { sector: o.sector, sizeBand: o.size_band });
  }

  // Group responses by org.
  const byOrg = new Map<string, SurveyResponse[]>();
  for (const r of responseRows ?? []) {
    const orgId = auditToOrg.get(r.audit_id as string);
    if (!orgId || !orgMeta.has(orgId)) continue;
    const list = byOrg.get(orgId) ?? [];
    list.push({
      segment: null,
      answers: (r.answers as SurveyResponse["answers"]) ?? {},
    });
    byOrg.set(orgId, list);
  }

  // Per-org dimension scores → grouped into sector/size cells.
  const cells = new Map<string, Record<Dimension, number[]>>();
  const emptyCell = (): Record<Dimension, number[]> =>
    DIMENSIONS.reduce(
      (acc, d) => {
        acc[d] = [];
        return acc;
      },
      {} as Record<Dimension, number[]>,
    );

  for (const [orgId, responses] of byOrg) {
    const meta = orgMeta.get(orgId)!;
    const key = `${meta.sector}||${meta.sizeBand}`;
    const cell = cells.get(key) ?? emptyCell();
    for (const dimension of DIMENSIONS) {
      const score = dimensionScore(responses, dimension);
      if (score !== null) cell[dimension].push(score);
    }
    cells.set(key, cell);
  }

  // Upsert one snapshot per (sector, size, dimension).
  const rows: {
    sector: string;
    size_band: string;
    dimension: string;
    percentile_data: PercentileDistribution;
    n_companies: number;
    computed_at: string;
  }[] = [];
  const now = new Date().toISOString();
  for (const [key, cell] of cells) {
    const [sector, sizeBand] = key.split("||");
    for (const dimension of DIMENSIONS) {
      const scores = cell[dimension];
      if (scores.length === 0) continue;
      rows.push({
        sector,
        size_band: sizeBand,
        dimension,
        percentile_data: distributionFrom(scores),
        n_companies: scores.length,
        computed_at: now,
      });
    }
  }

  if (rows.length > 0) {
    await admin
      .from("benchmark_snapshots")
      .upsert(rows, { onConflict: "sector,size_band,dimension" });
  }

  return { cells: cells.size };
}

/**
 * Benchmark each of an audit's dimension scores against its sector/size peers.
 * Returns null per dimension when there is no score or insufficient peer data.
 * Reads through the caller's client, so RLS already hides sub-threshold cells.
 */
export async function getAuditBenchmarks(
  client: SupabaseClient,
  sector: string | null,
  sizeBand: string | null,
  dimensions: DimensionScores,
): Promise<Record<Dimension, BenchmarkResult | null>> {
  const result = DIMENSIONS.reduce(
    (acc, d) => {
      acc[d] = null;
      return acc;
    },
    {} as Record<Dimension, BenchmarkResult | null>,
  );

  if (!sector || !sizeBand) return result;

  const { data: snapshots } = await client
    .from("benchmark_snapshots")
    .select("dimension, percentile_data, n_companies")
    .eq("sector", sector)
    .eq("size_band", sizeBand);

  const byDimension = new Map<
    string,
    { dist: PercentileDistribution; n: number }
  >();
  for (const s of snapshots ?? []) {
    byDimension.set(s.dimension as string, {
      dist: s.percentile_data as PercentileDistribution,
      n: s.n_companies as number,
    });
  }

  for (const dimension of DIMENSIONS) {
    const score = dimensions[dimension];
    const snap = byDimension.get(dimension);
    if (score === null || !snap) continue;
    result[dimension] = benchmarkResult(score, snap.dist, snap.n);
  }

  return result;
}

export interface BenchmarkTeaser {
  sector: string;
  sizeBand: string;
  weakestDimension: Dimension;
  median: number;
  nCompanies: number;
}

/**
 * Public teasers for the /benchmarks page: per sector/size cell, the dimension
 * with the lowest median. Only cells the client can read (RLS: n_companies>=8)
 * are returned, so this degrades to an honest empty state early on.
 */
export async function getBenchmarkTeasers(
  client: SupabaseClient,
): Promise<BenchmarkTeaser[]> {
  const { data: snapshots } = await client
    .from("benchmark_snapshots")
    .select("sector, size_band, dimension, percentile_data, n_companies");

  const byCell = new Map<
    string,
    { sector: string; sizeBand: string; rows: { dimension: Dimension; p50: number; n: number }[] }
  >();

  for (const s of snapshots ?? []) {
    const key = `${s.sector}||${s.size_band}`;
    const cell =
      byCell.get(key) ??
      { sector: s.sector as string, sizeBand: s.size_band as string, rows: [] };
    cell.rows.push({
      dimension: s.dimension as Dimension,
      p50: (s.percentile_data as PercentileDistribution).p50,
      n: s.n_companies as number,
    });
    byCell.set(key, cell);
  }

  const teasers: BenchmarkTeaser[] = [];
  for (const cell of byCell.values()) {
    const weakest = [...cell.rows].sort((a, b) => a.p50 - b.p50)[0];
    if (!weakest) continue;
    teasers.push({
      sector: cell.sector,
      sizeBand: cell.sizeBand,
      weakestDimension: weakest.dimension,
      median: weakest.p50,
      nCompanies: weakest.n,
    });
  }

  return teasers.sort((a, b) => a.median - b.median);
}
