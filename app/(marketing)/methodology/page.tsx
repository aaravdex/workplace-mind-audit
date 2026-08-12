import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/Disclaimer";
import { ButtonLink } from "@/components/ui/Button";
import { DIMENSIONS, DIMENSION_META } from "@/lib/constants";
import { COEFFICIENT_CATALOG } from "@/lib/coefficients";
import {
  TA_CITATION,
  TA_METHOD_STATEMENT,
  TA_QUALITY_ATTRIBUTION,
  TA_QUALITY_CHECKLIST,
} from "@/lib/ta-methodology";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the 5C model is scored, how findings and open-text themes are produced, and exactly how we model cost — every coefficient shown with its published source.",
};

const ANALYSIS_STEPS: { name: string; body: string }[] = [
  {
    name: "Data quality & confidence",
    body: "Every finding carries a confidence rating — from insufficient to high — based on sample size, response rate and answer quality, so nothing ever sounds more certain than the evidence allows.",
  },
  {
    name: "Findings",
    body: "For each dimension we separate what we observed (the scores and item responses) from what it might mean (interpretation) from why it might be happening (hypotheses). Hypotheses are always labelled as hypotheses to validate — never stated as fact.",
  },
  {
    name: "Patterns",
    body: "Where several factors combine into a recognised risk pattern, we name it — as a pattern to test, not a proven cause.",
  },
  {
    name: "Prioritisation",
    body: "Risks are ranked by severity, reach, business impact, confidence and how feasibly they can be changed — so you act on the few things that matter first, not everything at once.",
  },
  {
    name: "Interventions",
    body: "Each recommendation has a named accountable owner, concrete steps, and both leading and lagging measures. Individual support (EAP, occupational health) is always placed beneath the work-design change, never offered as a substitute for it.",
  },
  {
    name: "Validation & measurement",
    body: "Findings are preliminary until confirmed through focus groups and operational data. We provide the discussion guides and the re-measurement pulses that turn a preliminary read into a confirmed one.",
  },
];

const COST_LINES: { name: string; formula: string; note: string }[] = [
  {
    name: "Absenteeism",
    formula: "employees × stress-related sick days × (salary ÷ 260)",
    note: "Lost paid days converted to a daily salary cost.",
  },
  {
    name: "Presenteeism",
    formula: "employees × salary × productivity-loss %",
    note: "Reduced output while still at work — usually the largest, most hidden line.",
  },
  {
    name: "Attrition",
    formula: "employees × turnover % × replacement cost",
    note: "Stress shows up as resignations; replacing people is expensive.",
  },
  {
    name: "Manager overload",
    formula: "monthly people-hours × hourly cost × 12",
    note: "Leadership time consumed firefighting people problems.",
  },
];

export default function MethodologyPage() {
  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          Transparency
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-brand-900">
          How the audit works — from evidence to action
        </h1>
        <p className="mt-4 text-lg text-brand-600">
          Provenance is the point. A number you can trace is a number a CFO can
          trust. Below is exactly how we score the five dimensions, how we turn
          responses into defensible findings and open-text themes, how each cost
          line is computed, and every coefficient behind the financial estimate —
          each framed as a modelled estimate with its published source. The whole
          analysis is deterministic: no AI, no black box.
        </p>
      </div>

      {/* The 5C model */}
      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold text-brand-900">
          The 5C Workplace Risk Model
        </h2>
        <p className="mt-3 text-brand-600">
          Every survey question maps to exactly one dimension. Answers on a 1–5
          scale are normalised to 0–100 (higher is healthier), reverse-scored
          where agreement indicates worse wellbeing, and averaged — skipped
          questions are ignored, never counted as zero.
        </p>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-brand-100 bg-brand-100 sm:grid-cols-2">
          {DIMENSIONS.map((d) => (
            <div key={d} className="bg-white p-5">
              <dt className="font-serif text-lg font-semibold text-brand-900">
                {DIMENSION_META[d].label}
              </dt>
              <dd className="mt-1 text-sm text-brand-600">
                {DIMENSION_META[d].blurb}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How the analysis works */}
      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold text-brand-900">
          How the analysis works
        </h2>
        <p className="mt-3 text-brand-600">
          A score on its own is not a diagnosis. Every audit runs the same
          deterministic analysis that turns responses into a defensible read:
        </p>
        <div className="mt-6 space-y-3">
          {ANALYSIS_STEPS.map((step) => (
            <div
              key={step.name}
              className="rounded-xl border border-brand-100 bg-white p-5"
            >
              <h3 className="text-base font-semibold text-brand-900">
                {step.name}
              </h3>
              <p className="mt-2 text-sm text-brand-500">{step.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-600">
          <span className="font-semibold text-brand-900">
            Two lines we never cross.
          </span>{" "}
          We never diagnose an individual or infer a mental-health condition —
          results are aggregate patterns only, and no employer ever sees an
          individual response. And because a survey is a snapshot in time, we
          never claim it proves cause.
        </p>
      </section>

      {/* Open-text: reflexive thematic analysis */}
      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold text-brand-900">
          Open-text: reflexive thematic analysis
        </h2>
        <p className="mt-3 text-brand-600">{TA_METHOD_STATEMENT}</p>
        <ul className="mt-6 space-y-2">
          {TA_QUALITY_CHECKLIST.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-brand-600">
              <span aria-hidden className="text-accent-500">
                &middot;
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs italic text-brand-400">
          {TA_QUALITY_ATTRIBUTION} {TA_CITATION}
        </p>
      </section>

      {/* How costs are modelled */}
      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold text-brand-900">
          How we model cost
        </h2>
        <p className="mt-3 text-brand-600">
          The estimate sums four annual cost lines. Each is a defensible business
          calculation, not a black box:
        </p>
        <div className="mt-6 space-y-3">
          {COST_LINES.map((line) => (
            <div
              key={line.name}
              className="rounded-xl border border-brand-100 bg-white p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-brand-900">
                  {line.name}
                </h3>
                <code className="rounded bg-brand-50 px-2 py-1 text-xs text-brand-600">
                  {line.formula}
                </code>
              </div>
              <p className="mt-2 text-sm text-brand-500">{line.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coefficients */}
      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold text-brand-900">
          The coefficients, and where they come from
        </h2>
        <p className="mt-3 text-brand-600">
          When you do not supply your own figure, we fall back to these
          well-established public ranges — never an invented number. Anything we
          could not anchor to a credible public source would be labelled an
          assumption.
        </p>
        <div className="mt-6 overflow-hidden rounded-xl border border-brand-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50 text-xs uppercase tracking-wide text-brand-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Coefficient</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Source &amp; note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {COEFFICIENT_CATALOG.map((c) => (
                <tr key={c.key} className="align-top">
                  <td className="px-4 py-4 font-medium text-brand-900">
                    {c.name}
                    {c.assumption && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        assumption
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-brand-700">{c.value}</td>
                  <td className="px-4 py-4 text-brand-500">
                    <span className="font-medium text-brand-700">
                      {c.source.publication}.
                    </span>{" "}
                    {c.source.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* The loop */}
      <section className="mt-14 max-w-3xl">
        <h2 className="text-2xl font-semibold text-brand-900">
          From generic estimate to your actual figure
        </h2>
        <p className="mt-3 text-brand-600">
          The free calculator uses industry averages. Once you run an audit, your
          real 5C scores re-derive the cost: low Capacity raises modelled
          presenteeism, low Connection and Confidence raise modelled attrition.
          Every adjustment is bounded — no line moves by more than ±40% — so the
          result is a measured response to your data, never a fear lever.
        </p>
      </section>

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/calculator">Try the calculator</ButtonLink>
        <ButtonLink href="/audit" variant="secondary">
          Run a Workplace Audit
        </ButtonLink>
      </div>

      <div className="mt-12 max-w-prose border-t border-brand-100 pt-6">
        <Disclaimer />
      </div>
    </Container>
  );
}
