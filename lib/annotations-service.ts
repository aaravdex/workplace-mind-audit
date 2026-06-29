import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditAnnotation } from "@/lib/annotations";

/**
 * Read an audit's consultant annotations through the caller's client. RLS allows
 * the audit's org owner OR a consultant to read, so the dashboard (owner) and
 * the annotate page (consultant) both work. Returns null when none exist yet.
 */
export async function getAuditAnnotations(
  client: SupabaseClient,
  auditId: string,
): Promise<AuditAnnotation | null> {
  const { data } = await client
    .from("audit_annotations")
    .select("executive_summary_note, dimension_notes")
    .eq("audit_id", auditId)
    .maybeSingle();

  if (!data) return null;
  return {
    executiveSummaryNote: (data.executive_summary_note as string | null) ?? "",
    dimensionNotes:
      (data.dimension_notes as Record<string, string> | null) ?? {},
  };
}
