import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { DIMENSION_META } from "@/lib/constants";
import { CASE_STUDIES } from "@/content/case-studies";
import type { Dimension } from "@/types";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Consulting narratives connecting workplace psychology, behavioural economics, and measurable business outcomes.",
};

export default function CaseStudiesPage() {
  return (
    <Container className="py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          Authority
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-brand-900">
          Case studies
        </h1>
        <p className="mt-4 text-lg text-brand-600">
          How workplace conditions become business outcomes — each one tracing a
          problem from psychology to behavioural economics to a measurable fix.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {CASE_STUDIES.map(({ meta }) => (
          <Link
            key={meta.slug}
            href={`/case-studies/${meta.slug}`}
            className="group flex flex-col rounded-xl border border-brand-100 bg-white p-6 transition-colors hover:border-accent-300"
          >
            <div className="flex flex-wrap gap-1.5">
              {meta.focus.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-500"
                >
                  {DIMENSION_META[f as Dimension]?.label ?? f}
                </span>
              ))}
            </div>
            <h2 className="mt-3 font-serif text-lg font-semibold text-brand-900 group-hover:text-accent-700">
              {meta.title}
            </h2>
            <p className="mt-2 flex-1 text-sm text-brand-600">{meta.summary}</p>
            <span className="mt-4 text-xs font-medium text-brand-400">
              {meta.readingTime}
            </span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
