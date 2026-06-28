import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Burnout Cost Calculator" };

export default function CalculatorPage() {
  return (
    <PagePlaceholder
      eyebrow="Attract"
      title="Burnout Cost Calculator"
      description="A free, instant estimate of the annual cost of burnout across absenteeism, presenteeism, attrition, and manager overload. The on-screen result will always be free; only the detailed PDF is gated."
      phase="Phase 2"
    />
  );
}
