import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isConsultant } from "@/lib/auth";
import { getAuditAnnotations } from "@/lib/annotations-service";
import { buildAuditScores } from "@/lib/scores-service";
import { AnnotationEditor } from "@/components/AnnotationEditor";
import { SetupNotice } from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

/**
 * Consultant-only annotation editor (Supabase `consultant` claim). Writes the
 * human-authored interpretation that threads into the dashboard and the PDF.
 */
export default async function AnnotatePage({
  params,
}: {
  params: { auditId: string };
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only consultants may reach this editor.
  if (!isConsultant(user)) notFound();

  const scores = await buildAuditScores(supabase, params.auditId);
  if (!scores) notFound();

  const annotation = (await getAuditAnnotations(supabase, params.auditId)) ?? {
    executiveSummaryNote: "",
    dimensionNotes: {},
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/dashboard/${params.auditId}`}
        className="text-sm text-brand-500 hover:text-brand-800"
      >
        ← Back to dashboard
      </Link>
      <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-accent-600">
        Consultant tools
      </p>
      <h1 className="mt-2 font-serif text-2xl font-semibold text-brand-900">
        Bespoke interpretation — {scores.audit.title}
      </h1>
      <p className="mt-2 text-sm text-brand-500">
        Your words appear in the dashboard and the PDF. This is what turns a
        generated report into an authored one.
      </p>

      <div className="mt-8">
        <AnnotationEditor auditId={params.auditId} initial={annotation} />
      </div>
    </div>
  );
}
