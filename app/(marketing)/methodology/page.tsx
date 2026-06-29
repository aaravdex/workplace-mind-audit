import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/Disclaimer";
import { ButtonLink } from "@/components/ui/Button";
import { DIMENSIONS, DIMENSION_META } from "@/lib/constants";
import { COEFFICIENT_CATALOG } from "@/lib/coefficients";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the 5C model is scored and exactly how we model cost — every coefficient shown with its published source.",
};

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
          The 5C model &amp; how we model cost
        </h1>
        <p className="mt-4 text-lg text-brand-600">
          Provenance is the point. A number you can trace is a number a CFO can
          trust. Below is exactly how we score the five dimensions, how each cost
          line is computed, and every coefficient behind the financial estimate —
          each shown with its published source and framed as a modelled estimate.
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
