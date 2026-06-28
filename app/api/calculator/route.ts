import { NextResponse } from "next/server";

// POST: compute burnout-cost breakdown (+ optional anonymous calculator_runs
// logging). Implemented in Phase 2 against the pure lib/calculator.ts engine.
export async function POST() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 2" },
    { status: 501 },
  );
}
