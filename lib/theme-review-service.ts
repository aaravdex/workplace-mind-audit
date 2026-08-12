import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ThemeReview } from "@/lib/thematicAnalysis";

/**
 * Reads the consultant's thematic-analysis review (Phases 4–5) for an audit.
 * Stored on audit_annotations (consultant-write / owner-OR-consultant-read), so
 * the client can SEE the reviewed themes through their RLS-scoped client but only
 * a consultant can SET the review. Returns {} when none exists yet.
 */
export async function getThemeReview(
  supabase: SupabaseClient,
  auditId: string,
): Promise<ThemeReview> {
  const { data } = await supabase
    .from("audit_annotations")
    .select("theme_review")
    .eq("audit_id", auditId)
    .maybeSingle();
  const raw = data?.theme_review;
  return raw && typeof raw === "object" ? (raw as ThemeReview) : {};
}
