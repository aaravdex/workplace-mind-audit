import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PagePlaceholder
      eyebrow="About"
      title="Where psychology meets the balance sheet"
      description="Our positioning, the thinking behind the 5C model, and how we keep assessment ethical: aggregate-only, anonymous by design, and never diagnostic."
      phase="Phase 7"
    />
  );
}
