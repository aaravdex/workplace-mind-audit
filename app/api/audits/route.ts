import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CreateAuditSchema } from "@/lib/audits";

/**
 * POST: create an audit for the authenticated org owner. Finds (or creates) the
 * caller's organisation, then inserts an open audit with a fresh public_token.
 * RLS guarantees the audit can only attach to an org the caller owns.
 */
export async function POST(request: Request) {
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

  const parsed = CreateAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  // Find or create the caller's organisation.
  const { data: existingOrg } = await supabase
    .from("organisations")
    .select("id")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle();

  let orgId = existingOrg?.id as string | undefined;

  if (!orgId) {
    const { data: org, error } = await supabase
      .from("organisations")
      .insert({
        name: input.organisationName,
        industry: input.industry ?? null,
        sector: input.sector ?? null,
        size_band: input.sizeBand ?? null,
        owner_user_id: user.id,
      })
      .select("id")
      .single();
    if (error || !org) {
      return NextResponse.json(
        { error: "Could not create organisation" },
        { status: 500 },
      );
    }
    orgId = org.id;
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      org_id: orgId,
      title: input.title,
      segments: input.segments,
      status: "open",
      opened_at: new Date().toISOString(),
      // New audits default to the recommended segment reporting threshold of 10;
      // existing audits keep 5 (set by migration 0006). Floor of 5 always applies.
      reporting_threshold: 10,
    })
    .select("id, title, status, public_token")
    .single();

  if (auditError || !audit) {
    return NextResponse.json(
      { error: "Could not create audit" },
      { status: 500 },
    );
  }

  return NextResponse.json({ audit }, { status: 201 });
}
