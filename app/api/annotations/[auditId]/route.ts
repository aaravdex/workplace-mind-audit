import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isConsultant } from "@/lib/auth";
import { AnnotationInputSchema } from "@/lib/annotations";
import { DIMENSIONS } from "@/lib/constants";
import type { Dimension } from "@/types";

export const dynamic = "force-dynamic";

/**
 * PUT: upsert the consultant's bespoke interpretation for an audit. Writable
 * only by a user with the `consultant` claim (also enforced by RLS). Dimension
 * note keys are sanitised to the five Cs.
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
  if (!isConsultant(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AnnotationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Keep only the five known dimensions.
  const cleanNotes: Partial<Record<Dimension, string>> = {};
  for (const d of DIMENSIONS) {
    const note = parsed.data.dimensionNotes[d]?.trim();
    if (note) cleanNotes[d] = note;
  }

  const { error } = await supabase.from("audit_annotations").upsert(
    {
      audit_id: params.auditId,
      executive_summary_note: parsed.data.executiveSummaryNote || null,
      dimension_notes: cleanNotes,
      author_user_id: user!.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "audit_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Could not save annotations" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
