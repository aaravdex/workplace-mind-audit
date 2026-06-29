import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Benchmarks" };

export default function BenchmarksPage() {
  return (
    <PagePlaceholder
      eyebrow="The moat"
      title="See where you stand against your sector"
      description="A score is forgettable; 'bottom quartile for Capacity among sub-50-person SaaS companies' is not. Anonymised sector and size benchmarks, shown only once enough organisations have contributed to be meaningful."
      phase="Phase 7"
    />
  );
}
