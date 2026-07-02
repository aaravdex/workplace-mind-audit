import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const StatusSchema = z.object({ status: z.enum(["open", "closed"]) });

/**
 * PATCH: open or close an audit. Owner-only — RLS on `audits` guarantees the
 * update touches only an audit the caller owns. Closing sets closed_at and makes
 * /api/responses reject new submissions (409).
 */
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

  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "status must be 'open' or 'closed'" },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();
  const patch =
    parsed.data.status === "closed"
      ? { status: "closed", closed_at: now }
      : { status: "open", opened_at: now, closed_at: null };

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

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
