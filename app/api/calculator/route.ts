import { NextResponse } from "next/server";
import { CalculatorInputSchema, computeBurnoutCost } from "@/lib/calculator";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST: compute the burnout-cost breakdown from validated inputs.
 * The live on-page estimate is computed client-side from the same pure function;
 * this endpoint is the canonical server computation (and the seam where an
 * anonymous calculator_run is logged).
 */
export async function POST(request: Request) {
  const limit = rateLimit(`calc:${hashIp(request)}`, 60, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

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

  // Best-effort anonymous analytics — never block the response on it.
  const admin = createAdminClient();
  if (admin) {
    try {
      await admin
        .from("calculator_runs")
        .insert({ payload: parsed.data, result });
    } catch (err) {
      console.error("[calculator] failed to log run:", err);
    }
  }

  return NextResponse.json({ result });
}
