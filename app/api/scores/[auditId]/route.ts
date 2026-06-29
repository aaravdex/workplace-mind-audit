import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildAuditScores } from "@/lib/scores-service";

/**
 * GET: computed 5C scores for an audit (auth, org-owner only).
 * Aggregation and the min-N anonymity guard run server-side in buildAuditScores;
 * any segment below MIN_RESPONSES_PER_SEGMENT (and the whole audit, if too small)
 * is never returned with scores.
 */
export async function GET(
  _request: Request,
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

  return NextResponse.json(scores);
}
