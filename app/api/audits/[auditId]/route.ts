import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MIN_RESPONSES_PER_SEGMENT } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * PATCH: update owner-controlled audit settings. Owner-only — RLS on `audits`
 * guarantees the update only touches an audit the caller owns (no row → 404).
 *
 * Accepts any subset of:
 *   • status              — open/closed (sets closed_at/opened_at). Closing makes
 *                           /api/responses reject new submissions (409).
 *   • invitedCount        — number invited, so a response rate can be computed.
 *   • reportingThreshold  — segment reporting minimum. Never below the platform
 *                           floor (enforced here AND in the scoring layer).
 */
const PatchSchema = z
  .object({
    status: z.enum(["open", "closed"]).optional(),
    invitedCount: z.number().int().min(0).nullable().optional(),
    reportingThreshold: z
      .number()
      .int()
      .min(MIN_RESPONSES_PER_SEGMENT)
      .optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.invitedCount !== undefined ||
      v.reportingThreshold !== undefined,
    { message: "Nothing to update" },
  );

export async function PATCH(
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

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    const now = new Date().toISOString();
    if (parsed.data.status === "closed") {
      patch.status = "closed";
      patch.closed_at = now;
    } else {
      patch.status = "open";
      patch.opened_at = now;
      patch.closed_at = null;
    }
  }
  if (parsed.data.invitedCount !== undefined) {
    patch.invited_count = parsed.data.invitedCount;
  }
  if (parsed.data.reportingThreshold !== undefined) {
    patch.reporting_threshold = parsed.data.reportingThreshold;
  }

  const { data, error } = await supabase
    .from("audits")
    .update(patch)
    .eq("id", params.auditId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not update the audit" },
      { status: 500 },
    );
  }
  if (!data) {
    // RLS returned no row → not the caller's audit (or missing).
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
