import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { DIMENSIONS, DIMENSION_META } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Practical guidance on workload, clarity, autonomy, support, and psychological safety — organised by the 5C model.",
};

const GUIDES: Record<string, { title: string; blurb: string }> = {
  capacity: {
    title: "Designing sustainable workloads",
    blurb:
      "Practical ways to match demand to capacity and protect recovery without slowing delivery.",
  },
  clarity: {
    title: "Making priorities unmistakable",
    blurb:
      "How to define success per role and remove the conflicting instructions that cause rework.",
  },
  control: {
    title: "Autonomy without chaos",
    blurb:
      "Pushing decisions to the work while keeping accountability — and dropping the monitoring.",
  },
  connection: {
    title: "The supported-manager playbook",
    blurb:
      "The few manager behaviours that buffer burnout: 1:1s, recognition, and fair conflict.",
  },
  confidence: {
    title: "Building everyday psychological safety",
    blurb:
      "Concrete practices that make it safe to raise concerns long before they become resignations.",
  },
};

export default function ResourcesPage() {
  return (
    <Container className="py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          Resources
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-brand-900">Resources</h1>
        <p className="mt-4 text-lg text-brand-600">
          Field guides organised by the five dimensions of the 5C model. Short,
          practical, and grounded in evidence — not platitudes.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <div
            key={d}
            className="rounded-xl border border-brand-100 bg-white p-6"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-400">
              {DIMENSION_META[d].label}
            </span>
            <h2 className="mt-2 font-serif text-lg font-semibold text-brand-900">
              {GUIDES[d].title}
            </h2>
            <p className="mt-2 text-sm text-brand-600">{GUIDES[d].blurb}</p>
            <span className="mt-3 inline-block text-xs font-medium text-brand-400">
              Guide coming soon
            </span>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-brand-50 p-6">
        <h2 className="font-serif text-lg font-semibold text-brand-900">
          For employees
        </h2>
        <p className="mt-2 text-sm text-brand-600">
          If you are struggling, these independent organisations offer free,
          confidential support: Mind, the Mental Health Foundation, and
          Samaritans. They are not affiliated with us and are not a substitute
          for professional advice.
        </p>
      </div>
    </Container>
  );
}
