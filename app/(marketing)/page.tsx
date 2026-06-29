import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import {
  DIMENSIONS,
  DIMENSION_META,
  TRUST_LINE,
} from "@/lib/constants";

const SYSTEM = [
  {
    step: "01",
    title: "Calculate",
    body: "A free Burnout Cost Calculator reframes a soft problem as an annual number your finance team understands.",
    href: "/calculator",
    cta: "Open the calculator",
  },
  {
    step: "02",
    title: "Diagnose",
    body: "An anonymous 5C Workplace Risk Audit locates the exact drivers — workload, clarity, control, connection, confidence.",
    href: "/audit",
    cta: "See how the audit works",
  },
  {
    step: "03",
    title: "Improve",
    body: "A consulting-grade dashboard and PDF translate findings into a prioritised, 30-day intervention plan.",
    href: "/services",
    cta: "Explore services",
  },
];

const AUDIENCE = [
  "Founders and startup leaders watching their best people burn out",
  "People and HR teams who need evidence, not anecdotes",
  "Heads of department accountable for delivery and retention",
  "Boards and investors assessing organisational health as risk",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-20 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
            Workplace psychology intelligence
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.1] text-brand-900 sm:text-5xl lg:text-6xl">
            Measure the hidden workplace risks affecting wellbeing,
            performance, and retention.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-600">
            Workplace Mind Audit combines behavioural science, organisational
            psychology, and business analytics to turn soft signals into hard
            numbers your leadership can act on.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/calculator" size="lg">
              Calculate Burnout Cost
            </ButtonLink>
            <ButtonLink href="/audit" variant="secondary" size="lg">
              Run Workplace Audit
            </ButtonLink>
          </div>
          <p className="mt-8 max-w-xl text-sm text-brand-400">{TRUST_LINE}</p>
        </Container>
      </section>

      {/* The problem */}
      <Container as="section" className="py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-brand-900">
              Leaders will not act on a feeling. They act on a figure.
            </h2>
            <p className="mt-4 max-w-prose text-brand-600">
              Stress, silence, and overload are real — but invisible on a
              balance sheet. They surface late, as sick days, quiet quitting,
              and resignations, long after the moment to intervene has passed.
            </p>
          </div>
          <p className="max-w-prose text-brand-600">
            This platform makes the invisible legible. It puts a defensible cost
            on burnout, then pinpoints the organisational conditions driving it
            — so you fix causes, not symptoms, and can prove the change worked.
          </p>
        </div>
      </Container>

      {/* Three-part system */}
      <section className="bg-brand-50">
        <Container className="py-16">
          <h2 className="text-3xl font-semibold text-brand-900">
            One system, three moves
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {SYSTEM.map((s) => (
              <div
                key={s.step}
                className="flex flex-col rounded-xl border border-brand-100 bg-white p-6"
              >
                <span className="font-serif text-2xl font-semibold text-accent-500">
                  {s.step}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-brand-900">
                  {s.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-brand-600">{s.body}</p>
                <a
                  href={s.href}
                  className="mt-4 text-sm font-medium text-accent-600 hover:text-accent-700"
                >
                  {s.cta} →
                </a>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* The 5C model */}
      <Container as="section" className="py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          The 5C Workplace Risk Model
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-brand-900">
          Five dimensions that decide whether work sustains people or drains
          them.
        </h2>
        <dl className="mt-10 grid gap-px overflow-hidden rounded-xl border border-brand-100 bg-brand-100 sm:grid-cols-2 lg:grid-cols-5">
          {DIMENSIONS.map((d) => (
            <div key={d} className="bg-white p-5">
              <dt className="font-serif text-lg font-semibold text-brand-900">
                {DIMENSION_META[d].label}
              </dt>
              <dd className="mt-2 text-sm text-brand-600">
                {DIMENSION_META[d].blurb}
              </dd>
            </div>
          ))}
        </dl>
      </Container>

      {/* Benchmark teaser — the moat */}
      <section className="bg-brand-900">
        <Container className="py-16">
          <div className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent-300">
                The benchmark moat
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                A score is forgettable. Your rank against peers is not.
              </h2>
              <p className="mt-4 max-w-prose text-brand-200">
                Every audit compares you with comparable organisations by sector
                and size — &ldquo;bottom quartile for Capacity among sub-50-person
                SaaS companies&rdquo; lands where &ldquo;62/100&rdquo; does not.
                We only ever show a benchmark once enough organisations stand
                behind it, so the comparison stays honest.
              </p>
              <div className="mt-6">
                <ButtonLink href="/benchmarks" variant="secondary">
                  See how you compare
                </ButtonLink>
              </div>
            </div>
            <div className="rounded-2xl bg-brand-800 p-6">
              <div className="space-y-3">
                {[
                  { label: "Capacity", pct: 22, tone: "bg-red-400" },
                  { label: "Connection", pct: 41, tone: "bg-amber-400" },
                  { label: "Confidence", pct: 78, tone: "bg-emerald-400" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs text-brand-200">
                      <span>{row.label}</span>
                      <span>{row.pct}th pctile</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-brand-700">
                      <div
                        className={`h-2 rounded-full ${row.tone}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-brand-300">
                  Illustrative. Real benchmarks appear in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Who it is for */}
      <section className="bg-brand-50">
        <Container className="py-16">
          <h2 className="text-3xl font-semibold text-brand-900">
            Who it is for
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {AUDIENCE.map((a) => (
              <li
                key={a}
                className="flex items-start gap-3 rounded-lg bg-white p-4 text-brand-700 ring-1 ring-inset ring-brand-100"
              >
                <span
                  aria-hidden
                  className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-500"
                />
                {a}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Final CTA */}
      <Container as="section" className="py-20">
        <div className="rounded-2xl bg-brand-900 px-8 py-14 text-center">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white">
            See what burnout is quietly costing your organisation.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-200">
            Start with the free calculator. The on-screen estimate is always
            free — no account required.
          </p>
          <div className="mt-8 flex justify-center">
            <ButtonLink href="/calculator" size="lg">
              Calculate Burnout Cost
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
