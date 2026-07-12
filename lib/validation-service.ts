import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ValidationStatuses } from "@/lib/validation";

/**
 * Reads a finding's validation statuses for an audit. Stored on audit_annotations
 * (a consultant-write / owner-OR-consultant-read table), so the client can SEE
 * the statuses through their RLS-scoped client but cannot set them.
 */
export async function getValidationStatuses(
  supabase: SupabaseClient,
  auditId: string,
): Promise<ValidationStatuses> {
  const { data } = await supabase
    .from("audit_annotations")
    .select("validation_statuses")
    .eq("audit_id", auditId)
    .maybeSingle();
  const raw = data?.validation_statuses;
  return raw && typeof raw === "object" ? (raw as ValidationStatuses) : {};
}
