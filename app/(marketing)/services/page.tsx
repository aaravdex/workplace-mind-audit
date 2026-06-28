import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <PagePlaceholder
      eyebrow="Convert"
      title="Services"
      description="Five tiers — Burnout Cost Report, Workplace Mind Audit, Leadership Debrief, Manager Training Workshop, and a 90-Day Wellbeing Intervention. Pricing is shown behind a feature flag and supports GBP and INR."
      phase="Phase 7"
    />
  );
}
