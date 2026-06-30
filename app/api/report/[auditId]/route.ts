import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildAuditScores } from "@/lib/scores-service";
import { getAuditBenchmarks } from "@/lib/benchmark-service";
import { getAuditAnnotations } from "@/lib/annotations-service";
import { CalculatorInputSchema } from "@/lib/calculator";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
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

  // Gather the loop, the benchmark, and the consultant's notes for the report.
  const [benchmarks, annotation, auditRow] = await Promise.all([
    getAuditBenchmarks(
      supabase,
      scores.audit.sector,
      scores.audit.sizeBand,
      scores.dimensions,
    ),
    getAuditAnnotations(supabase, scores.audit.id),
    supabase
      .from("audits")
      .select("cost_inputs")
      .eq("id", scores.audit.id)
      .maybeSingle(),
  ]);

  // Use the owner's real figures when present; otherwise sector-average, and
  // flag it so the report never presents a default as bespoke.
  const savedInputs = auditRow.data?.cost_inputs
    ? CalculatorInputSchema.safeParse(auditRow.data.cost_inputs)
    : null;
  const costIsRepresentative = !savedInputs?.success;
  const base = savedInputs?.success
    ? savedInputs.data
    : representativeBaseInputs(scores.audit.sizeBand, "GBP");

  const cost = auditAdjustedCost(base, scores.dimensions, {
    concentratedSegment: scores.concentratedSegment,
  });

  const pdf = await renderAuditReportPdf({
    scores,
    benchmarks,
    cost,
    annotation,
    costIsRepresentative,
  });
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
