import { Container } from "@/components/ui/Container";

/**
 * Full dashboard for a single audit: Executive Summary, 5C Risk Heatmap,
 * Department Comparison (min-N enforced), Financial Impact, and Recommended
 * Interventions. Built in Phase 5 against /api/scores/[auditId].
 */
export default function AuditDashboardPage({
  params,
}: {
  params: { auditId: string };
}) {
  return (
    <Container className="py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
        Report
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-brand-900">
        Audit dashboard
      </h1>
      <p className="mt-4 max-w-prose text-brand-600">
        The five-view dashboard for audit{" "}
        <code className="text-brand-600">{params.auditId}</code> arrives in Phase
        5, including the anonymity-guarded department comparison.
      </p>
    </Container>
  );
}
