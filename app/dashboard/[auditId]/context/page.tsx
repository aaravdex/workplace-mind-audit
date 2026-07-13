import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { ContextForm } from "@/components/dashboard/ContextForm";
import { OpenTextSettings } from "@/components/dashboard/OpenTextSettings";
import { ContextSchema, type AuditContext } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function AuditContextPage({
  params,
}: {
  params: { auditId: string };
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();
  // Owner-only via RLS: a non-owner (or unknown id) returns no row.
  const { data: audit } = await supabase
    .from("audits")
    .select("id, title, context, collect_open_text, open_text_verbatims")
    .eq("id", params.auditId)
    .maybeSingle();
  if (!audit) notFound();

  const parsed = audit.context ? ContextSchema.safeParse(audit.context) : null;
  const initialContext: AuditContext = parsed?.success ? parsed.data : {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <a
          href={`/dashboard/${audit.id}`}
          className="text-sm text-brand-500 hover:text-brand-800"
        >
          ← Back to audit
        </a>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-brand-900">
          Organisational context
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-500">
          {audit.title} · Every field is optional — treat this as your interview
          script and fill it with the client on a call. It shapes how findings
          are interpreted and never touches, or is shown in, the anonymous
          employee survey.
        </p>
      </div>
      <ContextForm auditId={audit.id} initialContext={initialContext} />

      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-brand-900">
          Open-text feedback
        </h2>
        <p className="mt-1 text-xs text-brand-400">
          Optional free-text questions on the employee survey — off unless you
          enable it here.
        </p>
        <div className="mt-3">
          <OpenTextSettings
            auditId={audit.id}
            collectOpenText={audit.collect_open_text === true}
            openTextVerbatims={audit.open_text_verbatims === true}
          />
        </div>
      </div>
    </div>
  );
}
