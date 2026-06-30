import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/Disclaimer";
import { ButtonLink } from "@/components/ui/Button";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { DimensionRadar } from "@/components/dashboard/DimensionRadar";
import { BenchmarkView } from "@/components/dashboard/BenchmarkView";
import { FinancialImpact } from "@/components/dashboard/FinancialImpact";
import { recommendations } from "@/lib/recommendations";
import { ninetyDayPlan } from "@/lib/report-content";
import { InterventionPlan } from "@/components/dashboard/InterventionPlan";
import { combinedInsights, riskBand } from "@/lib/scoring";
import { BAND_META, DIMENSIONS, DIMENSION_META, MIN_RESPONSES_PER_SEGMENT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BenchmarkResult } from "@/lib/benchmark";
import type { Dimension, DimensionScores, RiskBand } from "@/types";

export const metadata: Metadata = {
  title: "Sample report",
  description:
    "An illustrative Workplace Mind Audit dashboard — the exact views a client receives, with realistic seeded data.",
};

// ── Seeded example: a 90-person SaaS company under delivery pressure ───────────
const dimensions: DimensionScores = {
  capacity: 41,
  clarity: 63,
  control: 58,
  connection: 44,
  confidence: 52,
};
const overall = 52;
const responseCount = 36;

const benchmarks: Record<Dimension, BenchmarkResult | null> = {
  capacity: { score: 41, percentile: 18, band: "bottom quartile", nCompanies: 14 },
  clarity: { score: 63, percentile: 61, band: "above median", nCompanies: 14 },
  control: { score: 58, percentile: 47, band: "below median", nCompanies: 14 },
  connection: { score: 44, percentile: 22, band: "bottom quartile", nCompanies: 14 },
  confidence: { score: 52, percentile: 39, band: "below median", nCompanies: 14 },
};

const reportedSegments = [
  { segment: "Engineering", responseCount: 14, overall: 47, band: "Risk" as RiskBand },
  { segment: "Sales", responseCount: 9, overall: 56, band: "Watch" as RiskBand },
  { segment: "Customer Success", responseCount: 6, overall: 50, band: "Risk" as RiskBand },
];
const suppressedCount = 2;

const execNote =
  "The Capacity and Connection gaps concentrate in Engineering, tracking the two senior departures and the Q2 release crunch. Read this as a workload-and-support problem, not a perks problem — protect recovery time and coach the new EMs before adding headcount.";
const dimensionNotes: Partial<Record<Dimension, string>> = {
  capacity: "Engineering has been on a release sprint for nine weeks. Recovery norms, not resilience training, are the lever here.",
  connection: "Two senior departures left teams without consistent 1:1s. Re-establishing manager cadence should come first.",
};

const ranked = DIMENSIONS.map((d) => ({
  dimension: d,
  score: dimensions[d] as number,
  band: riskBand(dimensions[d] as number),
})).sort((a, b) => b.score - a.score);

const insights = combinedInsights(dimensions);
const recs = recommendations(dimensions);

export default function SampleReportPage() {
  return (
    <div className="bg-brand-50">
      <Container className="py-12">
        {/* Intro */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
            Sample deliverable
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-brand-900">
            What a client actually receives
          </h1>
          <p className="mt-4 text-lg text-brand-600">
            This is the live dashboard for an illustrative 90-person SaaS company.
            The same six views download as a consulting-grade PDF. Figures are a
            worked example, not a real organisation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/audit">Run your own audit</ButtonLink>
            <ButtonLink href="/calculator" variant="secondary">
              Start with the calculator
            </ButtonLink>
          </div>
        </div>

        {/* Dashboard */}
        <div className="mt-10 space-y-6">
          <header className="rounded-2xl border border-brand-100 bg-white p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-xl font-semibold text-brand-900">
                Q3 Wellbeing Audit — Northwind Software (sample)
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                open
              </span>
            </div>
            <p className="mt-2 text-sm text-brand-500">
              {responseCount} anonymous responses · SaaS / Software · 50–199 people
            </p>
          </header>

          {/* 1. Executive summary */}
          <Section title="1 · Executive summary" subtitle="The one-screen read for leadership.">
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="rounded-2xl bg-brand-900 p-6 text-center text-white">
                <div className="text-xs uppercase tracking-wider text-brand-300">
                  Workplace Mind Score
                </div>
                <div className="mt-1 font-serif text-5xl font-semibold">{overall}</div>
                <div className="mt-2">
                  <BandBadge band="Risk" />
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <RankedList title="Top strengths" items={ranked.slice(0, 3)} />
                <RankedList title="Top risk areas" items={[...ranked].slice(-3).reverse()} />
              </div>
            </div>

            {insights.length > 0 && (
              <div className="mt-6 space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight.title}
                    className={cn(
                      "rounded-lg p-4 text-sm ring-1 ring-inset",
                      insight.severity === "critical"
                        ? "bg-red-50 text-red-800 ring-red-200"
                        : "bg-amber-50 text-amber-900 ring-amber-200",
                    )}
                  >
                    <strong>{insight.title}.</strong> {insight.explanation}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 rounded-lg border-l-4 border-brand-900 bg-brand-50 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                Consultant&rsquo;s read
              </span>
              <p className="mt-1 text-sm italic text-brand-800">{execNote}</p>
            </div>
          </Section>

          {/* 2. Heatmap */}
          <Section title="2 · 5C risk heatmap" subtitle="Each dimension scored 0–100 and banded for instant triage.">
            <Heatmap dimensions={dimensions} />
            <div className="mt-6">
              <DimensionRadar dimensions={dimensions} />
            </div>
          </Section>

          {/* 3. Benchmark */}
          <Section title="3 · Benchmark" subtitle="Where you stand against comparable organisations — the relative view a CFO acts on.">
            <BenchmarkView
              benchmarks={benchmarks}
              dimensions={dimensions}
              sector="SaaS / Software"
              sizeBand="50-199"
            />
          </Section>

          {/* 4. Department comparison */}
          <Section
            title="4 · Department comparison"
            subtitle={`Only segments with at least ${MIN_RESPONSES_PER_SEGMENT} responses are shown — anonymity by design.`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-brand-400">
                    <th className="py-2 pr-4 font-medium">Department</th>
                    <th className="py-2 pr-4 font-medium">Responses</th>
                    <th className="py-2 pr-4 font-medium">Overall</th>
                    <th className="py-2 font-medium">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedSegments.map((seg) => (
                    <tr key={seg.segment} className="border-b border-brand-50">
                      <td className="py-2 pr-4 text-brand-800">{seg.segment}</td>
                      <td className="py-2 pr-4 text-brand-600">{seg.responseCount}</td>
                      <td className="py-2 pr-4 font-semibold text-brand-900">{seg.overall}</td>
                      <td className="py-2">
                        <BandBadge band={seg.band} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-brand-400">
              {suppressedCount} segments hidden to protect anonymity (fewer than{" "}
              {MIN_RESPONSES_PER_SEGMENT} responses).
            </p>
          </Section>

          {/* 5. Financial impact — the loop */}
          <Section title="5 · Financial impact" subtitle="Your generic estimate, re-derived from this audit's actual 5C scores.">
            <FinancialImpact dimensions={dimensions} sizeBand="50-199" concentratedSegment="Engineering" />
          </Section>

          {/* 6. Interventions */}
          <Section title="6 · Recommended interventions" subtitle="Prescribed where action is needed — dimensions in Risk or Critical.">
            <div className="space-y-4">
              {recs.map((rec) => (
                <div key={rec.dimension} className="rounded-xl border border-brand-100 p-5">
                  <div className="flex items-center gap-2">
                    <BandBadge band={rec.band} />
                    <h3 className="font-medium text-brand-900">{rec.title}</h3>
                    <span className="ml-auto text-sm text-brand-400">
                      {DIMENSION_META[rec.dimension].label} · {rec.score}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {rec.actions.map((action) => (
                      <li key={action} className="flex gap-2 text-sm text-brand-600">
                        <span aria-hidden className="text-accent-500">→</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                  {dimensionNotes[rec.dimension] && (
                    <p className="mt-3 border-l-4 border-brand-900 bg-brand-50 p-3 text-sm italic text-brand-800">
                      {dimensionNotes[rec.dimension]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* 7. 90-day intervention plan */}
          <Section
            title="7 · 90-day intervention plan"
            subtitle="A phased programme: stabilise, rebuild, then embed and re-measure."
          >
            <InterventionPlan windows={ninetyDayPlan(recs)} />
          </Section>
        </div>

        <div className="mt-10 max-w-prose border-t border-brand-100 pt-6">
          <Disclaimer />
        </div>
      </Container>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-white p-6">
      <h2 className="font-serif text-xl font-semibold text-brand-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-brand-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BandBadge({ band }: { band: RiskBand }) {
  const m = BAND_META[band];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        m.bg,
        m.text,
        m.ring,
      )}
    >
      {band}
    </span>
  );
}

function RankedList({
  title,
  items,
}: {
  title: string;
  items: { dimension: Dimension; score: number; band: RiskBand }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.dimension} className="flex items-center justify-between gap-2">
            <span className="text-sm capitalize text-brand-700">
              {DIMENSION_META[item.dimension].label}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-900">{item.score}</span>
              <BandBadge band={item.band} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
