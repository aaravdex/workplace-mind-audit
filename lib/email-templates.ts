import type { CalculatorResult } from "@/lib/calculator";
import { DISCLAIMER, RUN_AUDIT_CTA } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Plain, inline-styled HTML for the calculator lead email. Email clients are
 * unforgiving, so this stays deliberately simple (tables/inline styles).
 */
export function renderCalculatorReportEmail(opts: {
  name: string;
  result: CalculatorResult;
}): string {
  const { name, result } = opts;
  const money = (n: number) => formatCurrency(n, result.currency);

  const driverRows = result.topDrivers
    .map(
      (d) =>
        `<tr><td style="padding:6px 0;color:#38547A;">${d.label}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#14223A;">${d.formatted}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#F2F6FA;font-family:Arial,Helvetica,sans-serif;color:#14223A;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#A8512F;margin:0 0 8px;">Workplace Mind Audit</p>
      <h1 style="font-size:22px;margin:0 0 16px;">Hi ${name}, here is your burnout cost estimate</h1>

      <div style="background:#14223A;border-radius:12px;padding:24px;color:#fff;margin:16px 0;">
        <div style="font-size:12px;color:#9DB6D1;">Estimated annual burnout-related cost</div>
        <div style="font-size:30px;font-weight:700;margin-top:4px;">${money(result.total)}</div>
        <div style="font-size:13px;color:#C5D5E6;margin-top:8px;">Risk level: <strong>${result.riskLevel}</strong> · ${result.totalAsPctOfPayroll}% of payroll</div>
      </div>

      <h2 style="font-size:15px;margin:24px 0 8px;">Biggest cost drivers</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">${driverRows}</table>

      <div style="background:#FBF4EE;border:1px solid #ECC8AC;border-radius:10px;padding:16px;margin:24px 0;">
        <strong style="color:#874023;">Recommended next step</strong>
        <p style="margin:6px 0 0;font-size:14px;color:#582C1E;">${RUN_AUDIT_CTA}</p>
      </div>

      <p style="font-size:13px;color:#38547A;">${result.estimateNote}</p>
      <hr style="border:none;border-top:1px solid #C5D5E6;margin:24px 0;" />
      <p style="font-size:11px;line-height:1.5;color:#6E8FB5;">${DISCLAIMER}</p>
    </div>
  </body>
</html>`;
}
