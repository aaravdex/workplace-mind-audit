import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  status: z
    .enum([
      "not-started",
      "in-progress",
      "at-risk",
      "completed",
      "completed-ineffective",
      "deferred",
      "cancelled",
    ])
    .optional(),
  owner: z.string().trim().nullable().optional(),
  deadline: z.string().trim().nullable().optional(),
  evidence: z.string().trim().nullable().optional(),
  kpi: z.string().trim().nullable().optional(),
  reviewDate: z.string().trim().nullable().optional(),
  fidelity: z.record(z.string(), z.boolean()).nullable().optional(),
});

async function auth() {
  if (!isSupabaseConfigured())
    return { error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { supabase };
}

/** PATCH: update a tracker action (status, fidelity, evidence, …). RLS ensures
 *  the row belongs to the caller's audit; otherwise no row matches → 404. */
export async function PATCH(
  request: Request,
  { params }: { params: { auditId: string; actionId: string } },
) {
  const a = await auth();
  if (a.error) return a.error;
  const supabase = a.supabase;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid update" }, { status: 422 });

  const p = parsed.data;
  const patch: Record<string, unknown> = {};
  if (p.status !== undefined) patch.status = p.status;
  if (p.owner !== undefined) patch.owner = p.owner;
  if (p.deadline !== undefined) patch.deadline = p.deadline;
  if (p.evidence !== undefined) patch.evidence = p.evidence;
  if (p.kpi !== undefined) patch.kpi = p.kpi;
  if (p.reviewDate !== undefined) patch.review_date = p.reviewDate;
  if (p.fidelity !== undefined) patch.fidelity = p.fidelity;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 422 });

  const { data, error } = await supabase
    .from("audit_actions")
    .update(patch)
    .eq("id", params.actionId)
    .eq("audit_id", params.auditId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { auditId: string; actionId: string } },
) {
  const a = await auth();
  if (a.error) return a.error;
  const { data, error } = await a.supabase
    .from("audit_actions")
    .delete()
    .eq("id", params.actionId)
    .eq("audit_id", params.auditId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
