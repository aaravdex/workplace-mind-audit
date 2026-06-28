import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export const metadata: Metadata = { title: "Contact & Booking" };

export default function ContactPage() {
  return (
    <PagePlaceholder
      eyebrow="Talk to us"
      title="Contact & Booking"
      description="Book a leadership debrief or ask about a pilot. A booking-link placeholder will live here until scheduling is wired up."
      phase="Phase 7"
    />
  );
}
