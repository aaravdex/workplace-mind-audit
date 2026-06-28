import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Workplace Mind Audit" };

export default function AuditPage() {
  return (
    <PagePlaceholder
      eyebrow="Diagnose"
      title="The 5C Workplace Risk Audit"
      description="An anonymous, ~7-minute survey that scores your organisation across Capacity, Clarity, Control, Connection, and Confidence — then locates the conditions driving risk. Aggregate-only; no individual response is ever shown to employers."
      phase="Phases 3–5"
    />
  );
}
