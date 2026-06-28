import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage() {
  return (
    <PagePlaceholder
      eyebrow="Resources"
      title="Resources"
      description="Practical guides on workload design, role clarity, manager support, and psychological safety — plus general wellbeing links for employees."
      phase="Phase 7"
    />
  );
}
