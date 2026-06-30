import { NextResponse } from "next/server";
import { CalculatorInputSchema, computeBurnoutCost } from "@/lib/calculator";
import { renderBurnoutCostReportPdf } from "@/components/report/BurnoutCostReport";

// PDF generation is Node-only and runs at request time.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST: stream the branded Burnout Cost Report PDF for a set of calculator
 * inputs (+ optional company name). This is the calculator's gated deliverable.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CalculatorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const company =
    body && typeof (body as { company?: unknown }).company === "string"
      ? ((body as { company: string }).company.trim() || undefined)
      : undefined;

  const result = computeBurnoutCost(parsed.data);
  const pdf = await renderBurnoutCostReportPdf(result, company);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="burnout-cost-report.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
