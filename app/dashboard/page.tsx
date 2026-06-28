import { Container } from "@/components/ui/Container";

/**
 * Auth-gated list of an org owner's audits. Auth + Supabase land in Phase 3;
 * the five dashboard views in Phase 5. Scaffold only for now.
 */
export default function DashboardHomePage() {
  return (
    <Container className="py-20">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
        Report
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-brand-900">
        Your audits
      </h1>
      <p className="mt-4 max-w-prose text-brand-600">
        The authenticated dashboard lists every audit your organisation has run.
        Authentication and audit management arrive in Phase 3; the five
        dashboard views in Phase 5.
      </p>
    </Container>
  );
}
