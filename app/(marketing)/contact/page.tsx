import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Contact & Booking",
  description:
    "Book a leadership debrief, ask about a pilot, or just start with the free calculator.",
};

export default function ContactPage() {
  return (
    <Container className="max-w-3xl py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
        Talk to us
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-brand-900">
        Contact &amp; booking
      </h1>
      <p className="mt-4 text-lg text-brand-600">
        Whether you want to run a pilot, book a leadership debrief, or sense-check
        the numbers, start a conversation — or just run the free calculator first.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-100 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-brand-900">
            Book a call
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            A 30-minute intro to see whether an audit fits your organisation.
          </p>
          <div className="mt-4">
            <ButtonLink href="#" variant="secondary">
              Open booking calendar
            </ButtonLink>
            <p className="mt-2 text-xs text-brand-400">
              Booking link placeholder — connect your scheduler here.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-brand-100 bg-white p-6">
          <h2 className="font-serif text-lg font-semibold text-brand-900">
            Email
          </h2>
          <p className="mt-2 text-sm text-brand-600">
            Prefer to write? Reach us directly and we will respond within two
            working days.
          </p>
          <a
            href="mailto:hello@workplacemindaudit.example"
            className="mt-4 inline-block text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            hello@workplacemindaudit.example →
          </a>
        </div>
      </div>

      <div className="mt-10 rounded-2xl bg-brand-900 px-6 py-10 text-center">
        <h2 className="font-serif text-2xl font-semibold text-white">
          Not ready to talk yet?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-brand-200">
          Start with the free calculator. No account, no email required for the
          on-screen estimate.
        </p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/calculator">Calculate Burnout Cost</ButtonLink>
        </div>
      </div>
    </Container>
  );
}
