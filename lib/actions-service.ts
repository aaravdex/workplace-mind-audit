import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionStatus,
  FidelityRecord,
  TrackerAction,
} from "@/lib/evaluation";

const SELECT =
  "id, audit_id, title, owner, deadline, status, evidence, kpi, review_date, fidelity, intervention_id, created_at";

/** Tracker actions for an audit. RLS scopes to the audit's org owner or a
 *  consultant — a different org sees nothing (evidence included). */
export async function getAuditActions(
  supabase: SupabaseClient,
  auditId: string,
): Promise<TrackerAction[]> {
  const { data } = await supabase
    .from("audit_actions")
    .select(SELECT)
    .eq("audit_id", auditId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    auditId: r.audit_id as string,
    title: r.title as string,
    owner: (r.owner as string | null) ?? null,
    deadline: (r.deadline as string | null) ?? null,
    status: ((r.status as string) ?? "not-started") as ActionStatus,
    evidence: (r.evidence as string | null) ?? null,
    kpi: (r.kpi as string | null) ?? null,
    reviewDate: (r.review_date as string | null) ?? null,
    fidelity: (r.fidelity as FidelityRecord | null) ?? null,
    interventionId: (r.intervention_id as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}
