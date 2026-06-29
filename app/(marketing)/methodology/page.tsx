import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <PagePlaceholder
      eyebrow="Transparency"
      title="The 5C model & how we model cost"
      description="Exactly how the five dimensions are scored, and every coefficient behind the financial estimate — each one shown with its published source. Provenance is the point: a number you can trace is a number a CFO can trust."
      phase="Phase 2"
    />
  );
}
