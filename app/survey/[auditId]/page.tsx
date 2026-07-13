import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/Disclaimer";
import { SurveyForm } from "@/components/SurveyForm";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Anonymous, public, no-auth survey. The route param is the audit's unguessable
 * public_token (folder named [auditId] per the repo structure). The audit is
 * resolved server-side by token via the service-role client, reading only its
 * title/status/segments — never anything sensitive.
 */
export const dynamic = "force-dynamic";

export default async function SurveyPage({
  params,
}: {
  params: { auditId: string };
}) {
  const token = params.auditId;
  const admin = createAdminClient();

  if (!admin) {
    return <Unavailable message="This survey is not available right now." />;
  }

  const { data: audit } = await admin
    .from("audits")
    .select("title, status, segments, collect_open_text")
    .eq("public_token", token)
    .maybeSingle();

  if (!audit) {
    return (
      <Unavailable message="This survey link is not valid. Please check the link from your organisation." />
    );
  }
  if (audit.status !== "open") {
    return (
      <Unavailable message="This survey is currently closed. Thank you for your interest." />
    );
  }

  return (
    <SurveyForm
      token={token}
      title={audit.title}
      segments={(audit.segments as string[]) ?? []}
      collectOpenText={audit.collect_open_text === true}
    />
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center bg-brand-50">
      <Container className="max-w-lg py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold text-brand-900">
          Survey unavailable
        </h1>
        <p className="mt-3 text-brand-600">{message}</p>
        <div className="mt-8 rounded-lg bg-white p-4 ring-1 ring-inset ring-brand-100">
          <Disclaimer />
        </div>
      </Container>
    </div>
  );
}
