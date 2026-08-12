import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * PUT: set the consultant's review for one candidate theme (Phases 4–5 of
 * reflexive TA). CONSULTANT-ONLY — the write goes to audit_annotations, whose RLS
 * allows insert/update only for a consultant (0003). An owner's attempt matches
 * no row / fails the check → 403. Owners can still READ the review (that is how
 * the client sees the reviewed themes).
 */
const Schema = z.object({
  themeId: z.string().trim().min(1).max(64),
  decision: z.enum(["unreviewed", "keep", "merge", "discard"]),
  name: z.string().trim().max(120).optional(),
  definition: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(2000).optional(),
  mergedInto: z.string().trim().max(64).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { auditId: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid theme review" }, { status: 422 });
  }

  // A merge must name a target theme; anything else must not carry one.
  if (parsed.data.decision === "merge" && !parsed.data.mergedInto) {
    return NextResponse.json(
      { error: "A merge decision requires mergedInto." },
      { status: 422 },
    );
  }

  const { themeId, decision, name, definition, note, mergedInto } = parsed.data;
  const entry = {
    decision,
    ...(name ? { name } : {}),
    ...(definition ? { definition } : {}),
    ...(note ? { note } : {}),
    ...(decision === "merge" && mergedInto ? { mergedInto } : {}),
  };

  const { data: existing } = await supabase
    .from("audit_annotations")
    .select("theme_review")
    .eq("audit_id", params.auditId)
    .maybeSingle();
  const current =
    existing?.theme_review && typeof existing.theme_review === "object"
      ? (existing.theme_review as Record<string, unknown>)
      : {};
  const merged = { ...current, [themeId]: entry };

  if (existing) {
    const { data, error } = await supabase
      .from("audit_annotations")
      .update({
        theme_review: merged,
        author_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("audit_id", params.auditId)
      .select("audit_id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
    if (!data)
      return NextResponse.json(
        { error: "Reviewing themes requires the consultant role." },
        { status: 403 },
      );
  } else {
    const { error } = await supabase
      .from("audit_annotations")
      .insert({
        audit_id: params.auditId,
        theme_review: merged,
        author_user_id: user.id,
      });
    if (error)
      return NextResponse.json(
        { error: "Reviewing themes requires the consultant role." },
        { status: 403 },
      );
  }

  return NextResponse.json({ ok: true });
}
