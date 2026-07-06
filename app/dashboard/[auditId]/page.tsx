import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/SetupNotice";
import { buildAuditScores } from "@/lib/scores-service";
import { getAuditBenchmarks } from "@/lib/benchmark-service";
import { getAuditAnnotations } from "@/lib/annotations-service";
import { isConsultant } from "@/lib/auth";
import { recommendations } from "@/lib/recommendations";
import { ninetyDayPlan } from "@/lib/report-content";
import { InterventionPlan } from "@/components/dashboard/InterventionPlan";
import { AuditStatusControl } from "@/components/dashboard/AuditStatusControl";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { DimensionRadar } from "@/components/dashboard/DimensionRadar";
import { BenchmarkView } from "@/components/dashboard/BenchmarkView";
import { FinancialImpact } from "@/components/dashboard/FinancialImpact";
import { CalculatorInputSchema } from "@/lib/calculator";
import {
  BAND_META,
  DIMENSION_META,
  MIN_RESPONSES_PER_SEGMENT,
} from "@/lib/constants";
import { DataQualitySettings } from "@/components/dashboard/DataQualitySettings";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel, DataQuality } from "@/lib/dataQuality";
import type { DimensionScores, RiskBand, SegmentScoresResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function AuditDashboardPage({
  params,
}: {
  params: { auditId: string };
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = createClient();
  const scores = await buildAuditScores(supabase, params.auditId);
  if (!scores) notFound();

  const benchmarks = scores.sufficient
    ? await getAuditBenchmarks(
        supabase,
        scores.audit.sector,
        scores.audit.sizeBand,
        scores.dimensions,
      )
    : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const consultant = isConsultant(user);
  const annotation = await getAuditAnnotations(supabase, params.auditId);

  // The owner's saved business figures for the cost loop, if any.
  const { data: auditRow } = await supabase
    .from("audits")
    .select("cost_inputs")
    .eq("id", params.auditId)
    .maybeSingle();
  const savedInputsParsed = auditRow?.cost_inputs
    ? CalculatorInputSchema.safeParse(auditRow.cost_inputs)
    : null;
  const savedInputs = savedInputsParsed?.success ? savedInputsParsed.data : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const surveyUrl = `${siteUrl}/survey/${scores.audit.public_token}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold text-brand-900">
            {scores.audit.title}
          </h1>
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-600">
            {scores.audit.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-brand-500">
          {scores.responseCount} response
          {scores.responseCount === 1 ? "" : "s"} · share the anonymous survey:{" "}
          <span className="break-all text-brand-600">{surveyUrl}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`/dashboard/${scores.audit.id}/context`}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50"
          >
            Organisation context
          </a>
          {scores.sufficient && (
            <a
              href={`/api/report/${scores.audit.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
            >
              Download PDF report ↓
            </a>
          )}
          {consultant && (
            <a
              href={`/dashboard/${scores.audit.id}/annotate`}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50"
            >
              {annotation ? "Edit interpretation" : "Add interpretation"}
            </a>
          )}
          <AuditStatusControl
            auditId={scores.audit.id}
            status={scores.audit.status}
          />
        </div>
      </header>

      {!scores.sufficient ? (
        <NotEnough count={scores.responseCount} />
      ) : (
        <>
          {/* 1. Executive Summary */}
          <Section
            title="Executive summary"
            subtitle="The one-screen read for leadership."
          >
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="rounded-2xl bg-brand-900 p-6 text-center text-white">
                <div className="text-xs uppercase tracking-wider text-brand-300">
                  Workplace Mind Score
                </div>
                <div className="mt-1 font-serif text-5xl font-semibold">
                  {scores.overall}
                </div>
                <div className="mt-2">
                  <BandBadge band={scores.band} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <RankedList
                  title="Top strengths"
                  items={scores.ranked.slice(0, 3)}
                />
                <RankedList
                  title="Top risk areas"
                  items={[...scores.ranked].slice(-3).reverse()}
                />
              </div>
            </div>

            {scores.insights.length > 0 && (
              <div className="mt-6 space-y-2">
                {scores.insights.map((insight) => (
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

            {annotation?.executiveSummaryNote && (
              <ConsultantNote text={annotation.executiveSummaryNote} />
            )}

            <RecommendedPriority dimensions={scores.dimensions} />
          </Section>

          {/* Data quality & confidence */}
          <DataQualityCard dq={scores.dataQuality} auditId={scores.audit.id} />

          {/* 2. 5C Risk Heatmap */}
          <Section
            title="5C risk heatmap"
            subtitle="Each dimension scored 0–100 and banded for instant triage."
          >
            <Heatmap dimensions={scores.dimensions} />
            <div className="mt-6">
              <DimensionRadar dimensions={scores.dimensions} />
            </div>
          </Section>

          {/* 3. Benchmark — vs sector/size peers */}
          <Section
            title="Benchmark"
            subtitle="Where you stand against comparable organisations — the relative view a CFO acts on."
          >
            {benchmarks && (
              <BenchmarkView
                benchmarks={benchmarks}
                dimensions={scores.dimensions}
                sector={scores.audit.sector}
                sizeBand={scores.audit.sizeBand}
              />
            )}
          </Section>

          {/* 3. Department Comparison */}
          <Section
            title="Department comparison"
            subtitle={`Only segments with at least ${scores.reportingThreshold} responses are shown — anonymity by design.`}
          >
            <DepartmentTable
              segments={scores.segments}
              threshold={scores.reportingThreshold}
            />
          </Section>

          {/* 4. Financial Impact — THE LOOP */}
          <Section
            title="Financial impact"
            subtitle="Your generic estimate, re-derived from this audit's actual 5C scores."
          >
            <FinancialImpact
              dimensions={scores.dimensions}
              sizeBand={scores.audit.sizeBand}
              concentratedSegment={scores.concentratedSegment}
              auditId={scores.audit.id}
              savedInputs={savedInputs}
            />
          </Section>

          {/* 5. Recommended Interventions */}
          <Section
            title="Recommended interventions"
            subtitle="Prescribed where action is needed — dimensions in Risk or Critical."
          >
            <Interventions
              dimensions={scores.dimensions}
              notes={annotation?.dimensionNotes ?? {}}
            />
          </Section>

          {/* 7. 90-day intervention plan */}
          <Section
            title="90-day intervention plan"
            subtitle="A phased programme: stabilise, rebuild, then embed and re-measure."
          >
            <InterventionPlan
              windows={ninetyDayPlan(recommendations(scores.dimensions))}
            />
          </Section>
        </>
      )}
    </div>
  );
}

// ── Section pieces ──────────────────────────────────────────────

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
      <h2 className="font-serif text-xl font-semibold text-brand-900">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-brand-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const CONFIDENCE_META: Record<ConfidenceLevel, { label: string; cls: string }> =
  {
    high: {
      label: "High confidence",
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    moderate: {
      label: "Moderate confidence",
      cls: "bg-sky-50 text-sky-700 ring-sky-200",
    },
    exploratory: {
      label: "Exploratory",
      cls: "bg-amber-50 text-amber-800 ring-amber-200",
    },
    insufficient: {
      label: "Insufficient",
      cls: "bg-red-50 text-red-700 ring-red-200",
    },
  };

function DataQualityCard({
  dq,
  auditId,
}: {
  dq: DataQuality;
  auditId: string;
}) {
  const topSkipped = [...dq.itemMissingness]
    .filter((m) => m.missingPct > 0)
    .sort((a, b) => b.missingPct - a.missingPct)
    .slice(0, 3);
  const conf = CONFIDENCE_META[dq.confidence];
  return (
    <Section
      title="Data quality & confidence"
      subtitle="How much weight the evidence can bear."
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
            conf.cls,
          )}
        >
          {conf.label}
        </span>
        <span className="text-sm text-brand-500">
          {dq.confidenceReasons.join(" ")}
        </span>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <Stat label="Response rate" value={dq.responseRateLabel} />
        <Stat label="Responses" value={String(dq.completed)} />
        <Stat
          label="Low-quality responses"
          value={`${dq.integrity.flaggedResponses} of ${dq.completed}`}
        />
      </dl>
      {topSkipped.length > 0 && (
        <p className="mt-4 text-xs text-brand-500">
          Most-skipped questions:{" "}
          {topSkipped
            .map((m) => `Q${m.questionId} (${m.missingPct}%)`)
            .join(", ")}
        </p>
      )}
      <DataQualitySettings
        auditId={auditId}
        invitedCount={dq.invited}
        reportingThreshold={dq.reportingThreshold}
      />
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
      <dt className="text-xs font-medium uppercase tracking-wider text-brand-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-brand-900">{value}</dd>
    </div>
  );
}

function BandBadge({ band }: { band: RiskBand | null }) {
  if (!band) {
    return <span className="text-xs text-brand-300">No data</span>;
  }
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
  items: { dimension: string; score: number; band: RiskBand }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.dimension}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-sm capitalize text-brand-700">
              {DIMENSION_META[item.dimension as keyof typeof DIMENSION_META]
                ?.label ?? item.dimension}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-900">
                {item.score}
              </span>
              <BandBadge band={item.band} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendedPriority({
  dimensions,
}: {
  dimensions: DimensionScores;
}) {
  const recs = recommendations(dimensions);
  const lead =
    recs[0]?.title ??
    "Maintain current strengths — no dimension is in the Risk band.";
  return (
    <div className="mt-6 rounded-lg border border-accent-200 bg-accent-50 p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">
        Recommended intervention priority
      </span>
      <p className="mt-1 text-sm text-accent-900">{lead}</p>
    </div>
  );
}

function DepartmentTable({
  segments,
  threshold,
}: {
  segments: SegmentScoresResult;
  threshold: number;
}) {
  const { reported, suppressed } = segments;

  return (
    <div>
      {reported.length === 0 ? (
        <p className="text-sm text-brand-500">
          No segment yet has enough responses to report.
        </p>
      ) : (
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
              {reported.map((seg) => (
                <tr
                  key={seg.segment ?? "unsegmented"}
                  className="border-b border-brand-50"
                >
                  <td className="py-2 pr-4 text-brand-800">
                    {seg.segment ?? "Prefer not to say"}
                  </td>
                  <td className="py-2 pr-4 text-brand-600">
                    {seg.responseCount}
                  </td>
                  <td className="py-2 pr-4 font-semibold text-brand-900">
                    {seg.overall ?? "—"}
                  </td>
                  <td className="py-2">
                    <BandBadge band={seg.band} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {suppressed.length > 0 && (
        <p className="mt-4 text-xs text-brand-400">
          {suppressed.length} segment{suppressed.length === 1 ? "" : "s"} hidden
          to protect anonymity (fewer than {threshold} responses).
        </p>
      )}
    </div>
  );
}

function ConsultantNote({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-lg border-l-4 border-brand-900 bg-brand-50 p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
        Consultant&rsquo;s read
      </span>
      <p className="mt-1 text-sm italic text-brand-800">{text}</p>
    </div>
  );
}

function Interventions({
  dimensions,
  notes,
}: {
  dimensions: DimensionScores;
  notes: Record<string, string>;
}) {
  const recs = recommendations(dimensions);

  if (recs.length === 0) {
    return (
      <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
        No dimension is in the Risk or Critical band. Keep reinforcing what is
        working and re-run the audit next quarter to track drift.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {recs.map((rec) => (
        <div
          key={rec.dimension}
          className="rounded-xl border border-brand-100 p-5"
        >
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
                <span aria-hidden className="text-accent-500">
                  →
                </span>
                {action}
              </li>
            ))}
          </ul>
          {notes[rec.dimension] && (
            <p className="mt-3 border-l-4 border-brand-900 bg-brand-50 p-3 text-sm italic text-brand-800">
              {notes[rec.dimension]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function NotEnough({ count }: { count: number }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center">
      <h2 className="font-serif text-xl font-semibold text-brand-900">
        Not enough responses yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-brand-600">
        We need at least {MIN_RESPONSES_PER_SEGMENT} responses before showing any
        scores — this protects respondents&rsquo; anonymity. So far {count}{" "}
        {count === 1 ? "person has" : "people have"} responded.
      </p>
    </div>
  );
}
