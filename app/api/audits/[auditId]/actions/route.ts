import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAuditActions } from "@/lib/actions-service";

export const dynamic = "force-dynamic";

/**
 * Implementation tracker for an audit. Owner-of-org OR consultant, enforced by
 * RLS on audit_actions — a different org can neither read nor write, so evidence
 * is never exposed across orgs.
 */
export async function GET(
  _request: Request,
  { params }: { params: { auditId: string } },
) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ actions: await getAuditActions(supabase, params.auditId) });
}

const CreateSchema = z.object({
  title: z.string().trim().min(1),
  owner: z.string().trim().optional(),
  deadline: z.string().trim().optional(),
  kpi: z.string().trim().optional(),
  reviewDate: z.string().trim().optional(),
  interventionId: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { auditId: string } },
) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
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
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "A title is required" }, { status: 422 });

  const { data, error } = await supabase
    .from("audit_actions")
    .insert({
      audit_id: params.auditId,
      title: parsed.data.title,
      owner: parsed.data.owner ?? null,
      deadline: parsed.data.deadline ?? null,
      kpi: parsed.data.kpi ?? null,
      review_date: parsed.data.reviewDate ?? null,
      intervention_id: parsed.data.interventionId ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error)
    return NextResponse.json(
      { error: "Could not create the action (not your audit?)" },
      { status: 403 },
    );
  return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
}
