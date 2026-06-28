import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Case Studies" };

export default function CaseStudiesPage() {
  return (
    <PagePlaceholder
      eyebrow="Authority"
      title="Case Studies"
      description="MDX-driven consulting narratives following a fixed seven-part structure: Business Problem, Psychological Explanation, Organisational Consequence, Behavioural Economics Angle, Recommended Intervention, and Measurable Outcome."
      phase="Phase 7"
    />
  );
}
