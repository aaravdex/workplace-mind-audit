import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildAuditScores } from "@/lib/scores-service";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
import type { Currency } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET: audit-adjusted cost — THE LOOP. Re-derives the financial figure from the
 * audit's real 5C scores (bounded ±cap) using representative inputs for the org
 * size, and returns generic vs adjusted + delta. Owner-authenticated; refuses
 * audits below the min-N threshold.
 */
export async function GET(
  request: Request,
  { params }: { params: { auditId: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scores = await buildAuditScores(supabase, params.auditId);
  if (!scores) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (!scores.sufficient) {
    return NextResponse.json(
      { error: "Not enough responses to model cost yet" },
      { status: 409 },
    );
  }

  const currency: Currency =
    new URL(request.url).searchParams.get("currency") === "INR" ? "INR" : "GBP";

  const base = representativeBaseInputs(scores.audit.sizeBand, currency);
  const result = auditAdjustedCost(base, scores.dimensions, {
    concentratedSegment: scores.concentratedSegment,
  });

  return NextResponse.json({ cost: result });
}
