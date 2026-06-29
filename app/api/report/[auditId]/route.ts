import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildAuditScores } from "@/lib/scores-service";
import { renderAuditReportPdf } from "@/components/report/ReportDocument";

// PDF generation is Node-only and must run at request time, owner-authenticated.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: streams a consulting-grade PDF (application/pdf) for an audit. */
export async function GET(
  _request: Request,
  { params }: { params: { auditId: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scores = await buildAuditScores(supabase, params.auditId);
  if (!scores) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (!scores.sufficient) {
    return NextResponse.json(
      { error: "Not enough responses to generate a report yet" },
      { status: 409 },
    );
  }

  const pdf = await renderAuditReportPdf(scores);
  const filename = `workplace-mind-audit-${scores.audit.id}.pdf`;

  // Wrap the Node Buffer as a Uint8Array for a Web Response body (BodyInit).
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
