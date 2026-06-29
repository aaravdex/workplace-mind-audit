import { NextResponse } from "next/server";

// GET: sector/size percentile bands for a dimension, from benchmark_snapshots.
// REFUSES any pool with fewer than MIN_COMPANIES_PER_BENCHMARK distinct orgs.
// Implemented in Phase 7.
export async function GET() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 7" },
    { status: 501 },
  );
}
