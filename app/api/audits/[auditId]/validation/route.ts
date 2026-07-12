import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * PUT: set a validation status for a finding/pattern. CONSULTANT-ONLY — the write
 * goes to audit_annotations, whose RLS allows insert/update only for a consultant
 * (0003). An owner's attempt matches no row / fails the check → 403. Owners can
 * still READ the statuses (that's how the client sees them).
 */
const Schema = z.object({
  refId: z.string().trim().min(1),
  status: z.enum([
    "not-assessed",
    "supported",
    "partly-supported",
    "not-supported",
    "conflicting",
    "needs-investigation",
  ]),
  note: z.string().trim().optional(),
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
    return NextResponse.json({ error: "Invalid validation update" }, { status: 422 });
  }

  const entry = {
    status: parsed.data.status,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  };

  const { data: existing } = await supabase
    .from("audit_annotations")
    .select("validation_statuses")
    .eq("audit_id", params.auditId)
    .maybeSingle();
  const current =
    existing?.validation_statuses && typeof existing.validation_statuses === "object"
      ? (existing.validation_statuses as Record<string, unknown>)
      : {};
  const merged = { ...current, [parsed.data.refId]: entry };

  if (existing) {
    const { data, error } = await supabase
      .from("audit_annotations")
      .update({
        validation_statuses: merged,
        author_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("audit_id", params.auditId)
      .select("audit_id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
    if (!data)
      return NextResponse.json(
        { error: "Setting validation status requires the consultant role." },
        { status: 403 },
      );
  } else {
    const { error } = await supabase
      .from("audit_annotations")
      .insert({
        audit_id: params.auditId,
        validation_statuses: merged,
        author_user_id: user.id,
      });
    if (error)
      return NextResponse.json(
        { error: "Setting validation status requires the consultant role." },
        { status: 403 },
      );
  }

  return NextResponse.json({ ok: true });
}
