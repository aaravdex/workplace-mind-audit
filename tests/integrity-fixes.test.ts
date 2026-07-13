import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { rateLimit, shortHash, hashIp } from "@/lib/rate-limit";
import { isEmailConfigured } from "@/lib/email";
import { BenchmarkView } from "@/components/dashboard/BenchmarkView";
import { renderAuditReportPdf } from "@/components/report/ReportDocument";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
import { computeDataQuality } from "@/lib/dataQuality";
import type { AuditScores } from "@/lib/scores-service";
import type { Dimension, DimensionScores } from "@/types";

// ── A2: rate-limit + transient hashing ──────────────────────────────────────
describe("A2 — abuse protection", () => {
  it("blocks once the window max is exceeded", () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("hashes IPs deterministically and never returns the raw IP", () => {
    const r1 = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4" } });
    const r2 = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4" } });
    const r3 = new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9" } });
    const h1 = hashIp(r1);
    expect(hashIp(r2)).toBe(h1); // same IP → same key
    expect(hashIp(r3)).not.toBe(h1); // different IP → different key
    expect(h1).not.toContain("1.2.3.4");
    expect(shortHash("abc")).toHaveLength(12);
  });
});

// ── A1: email-config honesty ────────────────────────────────────────────────
describe("A1 — email configured state is truthful", () => {
  it("reflects RESEND_API_KEY presence", () => {
    const prev = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    expect(isEmailConfigured()).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    expect(isEmailConfigured()).toBe(true);
    if (prev === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prev;
  });
});

// ── A6: benchmark empty-state reads as maturing, not broken ──────────────────
describe("A6 — benchmark empty-state", () => {
  it("renders an honest 'unlocks' message with zero peer data", () => {
    const dims: DimensionScores = {
      capacity: 41,
      clarity: 63,
      control: 58,
      connection: 44,
      confidence: 52,
    };
    const empty = {
      capacity: null,
      clarity: null,
      control: null,
      connection: null,
      confidence: null,
    } as Record<Dimension, null>;
    const html = renderToStaticMarkup(
      BenchmarkView({
        benchmarks: empty,
        dimensions: dims,
        sector: "SaaS / Software",
        sizeBand: "50-199",
      }),
    );
    expect(html).toContain("unlocks");
    expect(html).toContain("scores and cost analysis are shown above");
  });
});

// ── A3: the report labels sector-average figures honestly ────────────────────
describe("A3 — cost figure provenance is labelled", () => {
  const dims: DimensionScores = {
    capacity: 41,
    clarity: 63,
    control: 58,
    connection: 44,
    confidence: 52,
  };
  const scores: AuditScores = {
    audit: {
      id: "a",
      title: "Q3",
      orgName: "Northwind",
      sector: "SaaS / Software",
      sizeBand: "50-199",
      status: "open",
      public_token: "t",
      created_at: new Date().toISOString(),
      segments: [],
    },
    sufficient: true,
    responseCount: 36,
    overall: 52,
    band: "Risk",
    dimensions: dims,
    ranked: [{ dimension: "capacity", score: 41, band: "Risk" }],
    insights: [],
    segments: { reported: [], suppressed: [] },
    concentratedSegment: "Engineering",
    dataQuality: computeDataQuality([], { reportingThreshold: 5 }),
    reportingThreshold: 5,
    findings: [],
    patterns: [],
    prioritisation: { items: [], safeguardingCount: 0, summary: "" },
    interventionPlan: { items: [], playbooks: [], roadmap: [], notes: [] },
    validationGuides: [],
    pulses: [],
    openTextThemes: [],
  };
  const cost = auditAdjustedCost(representativeBaseInputs("50-199", "GBP"), dims, {});

  it("produces a different PDF when the figure is sector-average vs bespoke", async () => {
    const representative = await renderAuditReportPdf({
      scores,
      benchmarks: null,
      cost,
      annotation: null,
      costIsRepresentative: true,
    });
    const bespoke = await renderAuditReportPdf({
      scores,
      benchmarks: null,
      cost,
      annotation: null,
      costIsRepresentative: false,
    });
    // Both are valid PDFs.
    expect(representative.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bespoke.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // The representative version carries the extra honesty banner → larger output.
    expect(representative.length).toBeGreaterThan(bespoke.length);
  }, 20000);
});
