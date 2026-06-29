import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { DIMENSIONS, DIMENSION_META, TRUST_LINE } from "@/lib/constants";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "About",
  description:
    "Where organisational psychology meets the balance sheet — and why every result is aggregate-only and never diagnostic.",
};

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
        About
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-brand-900">
        Where psychology meets the balance sheet
      </h1>
      <p className="mt-4 text-lg text-brand-600">{TRUST_LINE}</p>

      <div className="mt-10 space-y-4 text-brand-600">
        <p>
          Most wellbeing tools stop at a feeling. Leaders, reasonably, act on
          figures. Workplace Mind Audit exists to translate between the two:
          turning soft signals — overload, silence, low trust — into the hard
          business language of cost, performance, and retention, honestly and
          without overclaiming.
        </p>
        <p>
          The work draws on established occupational psychology — the job
          demands–resources model, psychological safety, autonomy and role
          clarity — and pairs it with behavioural economics to explain not just
          what is happening, but why the incentives make it rational.
        </p>
      </div>

      <h2 className="mt-12 font-serif text-2xl font-semibold text-brand-900">
        The 5C model
      </h2>
      <p className="mt-2 text-brand-600">
        Five memorable dimensions that decide whether work sustains people or
        drains them. Everything — questions, scores, charts, recommendations —
        is organised around them.
      </p>
      <dl className="mt-6 space-y-4">
        {DIMENSIONS.map((d) => (
          <div key={d} className="rounded-xl border border-brand-100 p-5">
            <dt className="font-serif text-lg font-semibold text-brand-900">
              {DIMENSION_META[d].label}
            </dt>
            <dd className="mt-1 text-sm text-brand-600">
              {DIMENSION_META[d].blurb}
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-12 font-serif text-2xl font-semibold text-brand-900">
        Ethics first
      </h2>
      <ul className="mt-4 space-y-2 text-brand-600">
        <li>· Aggregate-only — no individual response is shown to employers.</li>
        <li>· No department is reported until at least five people respond.</li>
        <li>· No names, emails, or IP addresses are tied to survey answers.</li>
        <li>· Never diagnostic — this assesses organisations, not individuals.</li>
      </ul>

      <div className="mt-10 rounded-lg bg-brand-50 p-4">
        <Disclaimer />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/calculator">Calculate Burnout Cost</ButtonLink>
        <ButtonLink href="/audit" variant="secondary">
          Run the audit
        </ButtonLink>
      </div>
    </Container>
  );
}
