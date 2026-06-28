import { NextResponse } from "next/server";
import { CalculatorInputSchema, computeBurnoutCost } from "@/lib/calculator";

/**
 * POST: compute the burnout-cost breakdown from validated inputs.
 * The live on-page estimate is computed client-side from the same pure function;
 * this endpoint is the canonical server computation (and the seam where an
 * anonymous calculator_run will be logged once the DB lands in Phase 3).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CalculatorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = computeBurnoutCost(parsed.data);
  // TODO(Phase 3): persist an anonymous calculator_run { payload, result }.
  return NextResponse.json({ result });
}
