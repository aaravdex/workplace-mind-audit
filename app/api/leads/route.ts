import { NextResponse } from "next/server";
import { LeadInputSchema } from "@/lib/leads";
import { computeBurnoutCost } from "@/lib/calculator";
import { sendEmail } from "@/lib/email";
import { renderCalculatorReportEmail } from "@/lib/email-templates";
import { renderBurnoutCostReportPdf } from "@/components/report/BurnoutCostReport";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST: capture a qualified lead and email them their estimate with the branded
 * Burnout Cost Report PDF attached. Consenting marketing data — kept entirely
 * separate from anonymous survey responses.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = LeadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const lead = parsed.data;
  // Compute server-side so the emailed figures are canonical.
  const result = computeBurnoutCost(lead.calculatorPayload);

  // Persist the lead (consenting marketing data) — best-effort.
  const admin = createAdminClient();
  if (admin) {
    try {
      await admin.from("leads").insert({
        name: lead.name,
        email: lead.email,
        role: lead.role,
        company_name: lead.companyName,
        company_size: lead.companySize ?? null,
        industry: lead.industry ?? null,
        calculator_payload: lead.calculatorPayload,
      });
    } catch (err) {
      console.error("[leads] failed to persist lead:", err);
    }
  }

  const pdf = await renderBurnoutCostReportPdf(result, lead.companyName);

  const email = await sendEmail({
    to: lead.email,
    subject: "Your burnout cost estimate — Workplace Mind Audit",
    html: renderCalculatorReportEmail({ name: lead.name, result }),
    attachments: [{ filename: "burnout-cost-report.pdf", content: pdf }],
  });

  return NextResponse.json({ ok: true, emailed: email.delivered });
}
