import { Container } from "@/components/ui/Container";

/**
 * Consultant-only annotation editor. Role-gated (Supabase `consultant` claim) in
 * Phase 8, where it writes audit_annotations — the human-authored interpretation
 * that makes each report read as authored, not generated.
 */
export default function AnnotatePage({
  params,
}: {
  params: { auditId: string };
}) {
  return (
    <Container className="py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
        Consultant tools
      </p>
      <h1 className="mt-3 font-serif text-2xl font-semibold text-brand-900">
        Bespoke interpretation
      </h1>
      <p className="mt-3 max-w-prose text-brand-600">
        A role-gated editor for the executive-summary note and an optional note
        per dimension, threaded into the dashboard and the PDF. Arrives in Phase
        8. Audit: <code className="text-brand-500">{params.auditId}</code>
      </p>
    </Container>
  );
}
