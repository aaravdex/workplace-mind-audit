import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildAuditScores } from "@/lib/scores-service";
import { CalculatorInputSchema, type CalculatorInput } from "@/lib/calculator";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
import type { Currency, SizeBand } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Resolve the base business inputs for an audit's cost loop: the owner's saved
 * figures if present (precise), otherwise sector-average defaults (clearly
 * flagged `representative: true` so nothing implies a default is bespoke).
 */
async function resolveBaseInputs(
  supabase: ReturnType<typeof createClient>,
  auditId: string,
  sizeBand: string | null,
  currency: Currency,
): Promise<{ base: CalculatorInput; representative: boolean }> {
  const { data } = await supabase
    .from("audits")
    .select("cost_inputs")
    .eq("id", auditId)
    .maybeSingle();

  const parsed = data?.cost_inputs
    ? CalculatorInputSchema.safeParse(data.cost_inputs)
    : null;

  if (parsed?.success) return { base: parsed.data, representative: false };
  return {
    base: representativeBaseInputs(sizeBand as SizeBand | null, currency),
    representative: true,
  };
}

/** GET: audit-adjusted cost — THE LOOP. Owner-auth; min-N guarded. */
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

  const { base, representative } = await resolveBaseInputs(
    supabase,
    params.auditId,
    scores.audit.sizeBand,
    currency,
  );
  const result = auditAdjustedCost(base, scores.dimensions, {
    concentratedSegment: scores.concentratedSegment,
  });

  return NextResponse.json({ cost: result, representative });
}

/** PUT: persist the owner's real business figures for this audit's cost loop. */
export async function PUT(
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

  // RLS guarantees the update only touches an audit the caller owns.
  const { error } = await supabase
    .from("audits")
    .update({ cost_inputs: parsed.data })
    .eq("id", params.auditId);

  if (error) {
    return NextResponse.json(
      { error: "Could not save your figures" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
