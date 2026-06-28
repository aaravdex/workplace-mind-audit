import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export default function CaseStudyPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <PagePlaceholder
      eyebrow="Case study"
      title={`Case study: ${params.slug}`}
      description="The full seven-part case study will render here from MDX content in content/case-studies."
      phase="Phase 7"
    />
  );
}
