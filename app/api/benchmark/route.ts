import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { benchmarkResult, type PercentileDistribution } from "@/lib/benchmark";

export const dynamic = "force-dynamic";

/**
 * GET /api/benchmark?sector=&sizeBand=&dimension=&score=
 * Returns the percentile + band for a score within its sector/size peer pool,
 * or { insufficient: true } when fewer than MIN_COMPANIES_PER_BENCHMARK distinct
 * orgs back the cell. Reads through the anon-scoped client, so the RLS guard
 * (n_companies >= 8) applies in the database before benchmarkResult double-checks.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ insufficient: true }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector");
  const sizeBand = searchParams.get("sizeBand");
  const dimension = searchParams.get("dimension");
  const score = Number(searchParams.get("score"));

  if (!sector || !sizeBand || !dimension || !Number.isFinite(score)) {
    return NextResponse.json(
      { error: "sector, sizeBand, dimension and score are required" },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: snapshot } = await supabase
    .from("benchmark_snapshots")
    .select("percentile_data, n_companies")
    .eq("sector", sector)
    .eq("size_band", sizeBand)
    .eq("dimension", dimension)
    .maybeSingle();

  if (!snapshot) {
    return NextResponse.json({ insufficient: true });
  }

  const result = benchmarkResult(
    score,
    snapshot.percentile_data as PercentileDistribution,
    snapshot.n_companies as number,
  );

  return NextResponse.json(result ? { result } : { insufficient: true });
}
