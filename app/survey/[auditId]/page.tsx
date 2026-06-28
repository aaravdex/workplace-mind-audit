import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/Disclaimer";

/**
 * Anonymous, public, no-auth survey. The route param is the audit's unguessable
 * `public_token` (folder named [auditId] per the repo structure). Phase 4 loads
 * the audit, renders the 25 questions grouped by C, and posts to /api/responses.
 * No name, email, or IP is ever collected.
 */
export default function SurveyPage({
  params,
}: {
  params: { auditId: string };
}) {
  return (
    <div className="min-h-screen bg-brand-50">
      <Container className="mx-auto max-w-2xl py-16">
        <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
            Anonymous survey
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-brand-900">
            Your responses are completely anonymous
          </h1>
          <p className="mt-4 text-brand-600">
            This survey takes about seven minutes. Every question is optional,
            and your individual answers are never shown to your employer — only
            aggregated patterns are reported.
          </p>

          <div className="mt-6 rounded-lg bg-brand-50 p-4">
            <Disclaimer />
          </div>

          <p className="mt-6 text-sm text-brand-400">
            Survey form (25 questions grouped by the 5C model) arrives in Phase
            4. Audit token: <code className="text-brand-600">{params.auditId}</code>
          </p>
        </div>
      </Container>
    </div>
  );
}
