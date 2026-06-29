import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { CASE_STUDIES, getCaseStudy } from "@/content/case-studies";

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.meta.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const study = getCaseStudy(params.slug);
  if (!study) return {};
  return { title: study.meta.title, description: study.meta.summary };
}

export default function CaseStudyPage({
  params,
}: {
  params: { slug: string };
}) {
  const study = getCaseStudy(params.slug);
  if (!study) notFound();

  const { Content, meta } = study;

  return (
    <Container className="max-w-3xl py-14">
      <Link
        href="/case-studies"
        className="text-sm text-brand-500 hover:text-brand-800"
      >
        ← All case studies
      </Link>

      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-accent-600">
        Case study · {meta.readingTime}
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-brand-900">
        {meta.title}
      </h1>
      <p className="mt-4 text-lg text-brand-600">{meta.summary}</p>

      <article className="mt-8 border-t border-brand-100 pt-2">
        <Content />
      </article>

      <div className="mt-12 rounded-2xl bg-brand-900 px-6 py-10 text-center">
        <h2 className="font-serif text-2xl font-semibold text-white">
          Curious what these patterns are costing you?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-brand-200">
          Start with the free calculator, then run the audit to locate the cause.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/calculator">Calculate Burnout Cost</ButtonLink>
          <ButtonLink href="/audit" variant="secondary">
            Run the audit
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
