import { describe, it, expect } from "vitest";
import { renderAuditReportPdf } from "@/components/report/ReportDocument";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
import { computeDataQuality } from "@/lib/dataQuality";
import type { AuditScores } from "@/lib/scores-service";
import type { DimensionScores } from "@/types";

const dimensions: DimensionScores = {
  capacity: 45,
  clarity: 70,
  control: 60,
  connection: 38,
  confidence: 55,
};

const scores: AuditScores = {
  audit: {
    id: "demo-audit",
    title: "Q3 Wellbeing Audit",
    orgName: "Acme Ltd",
    sector: "SaaS / Software",
    sizeBand: "50-199",
    status: "open",
    public_token: "demo-token",
    created_at: new Date().toISOString(),
    segments: ["Engineering", "Operations"],
  },
  sufficient: true,
  responseCount: 42,
  overall: 54,
  band: "Risk",
  dimensions,
  ranked: [
    { dimension: "clarity", score: 70, band: "Watch" },
    { dimension: "control", score: 60, band: "Watch" },
    { dimension: "confidence", score: 55, band: "Risk" },
    { dimension: "capacity", score: 45, band: "Risk" },
    { dimension: "connection", score: 38, band: "Critical" },
  ],
  insights: [
    {
      severity: "critical",
      title: "High burnout risk",
      explanation: "Heavy load with weak managerial support.",
    },
  ],
  segments: { reported: [], suppressed: [] },
  concentratedSegment: "Operations",
  dataQuality: computeDataQuality([], { reportingThreshold: 5 }),
  reportingThreshold: 5,
};

describe("PDF report", () => {
  it("renders a valid PDF with the loop, benchmark, and consultant notes", async () => {
    const cost = auditAdjustedCost(
      representativeBaseInputs("50-199", "GBP"),
      dimensions,
      { concentratedSegment: "Operations" },
    );

    const buffer = await renderAuditReportPdf({
      scores,
      benchmarks: {
        capacity: {
          score: 45,
          percentile: 18,
          band: "bottom quartile",
          nCompanies: 12,
        },
        clarity: null,
        control: null,
        connection: {
          score: 38,
          percentile: 9,
          band: "bottom quartile",
          nCompanies: 12,
        },
        confidence: null,
      },
      cost,
      annotation: {
        executiveSummaryNote:
          "The Connection gap in Operations tracks the two senior departures last quarter.",
        dimensionNotes: { connection: "Watch Operations specifically." },
      },
    });

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 20000);
});
