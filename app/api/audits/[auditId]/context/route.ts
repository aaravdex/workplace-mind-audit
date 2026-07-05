import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ContextSchema } from "@/lib/context";

export const dynamic = "force-dynamic";

/**
 * PUT: save the organisational context for an audit. Owner-only — RLS on
 * `audits` guarantees the update only ever touches an audit the caller owns
 * (a non-owner's update matches no row → 404). Context is org-level business
 * context, never employee PII, validated with ContextSchema before storage.
 */
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

  const parsed = ContextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid context", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("audits")
    .update({ context: parsed.data })
    .eq("id", params.auditId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not save context" },
      { status: 500 },
    );
  }
  if (!data) {
    // RLS returned no row → not the caller's audit (or missing).
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
