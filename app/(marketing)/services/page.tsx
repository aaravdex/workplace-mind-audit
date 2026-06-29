import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { SERVICE_TIERS } from "@/content/services";
import { formatCurrency } from "@/lib/utils";
import { CheckoutButton } from "@/components/CheckoutButton";

export const metadata: Metadata = {
  title: "Services",
  description:
    "From a free burnout cost report to a 90-day wellbeing intervention — five ways to turn diagnosis into change.",
};

const SHOW_PRICING =
  process.env.NEXT_PUBLIC_ENABLE_PUBLIC_PRICING === "true";
const PAYMENTS_ENABLED = process.env.ENABLE_PAYMENTS === "true";

function priceLabel(priceGBP: number, priceINR: number): string {
  if (priceGBP === 0) return "Free";
  return `${formatCurrency(priceGBP, "GBP")} · ${formatCurrency(priceINR, "INR")}`;
}

export default function ServicesPage() {
  return (
    <Container className="py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          Convert
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-brand-900">Services</h1>
        <p className="mt-4 text-lg text-brand-600">
          The software diagnoses; people drive the change. Each tier moves you
          one step further from a number on a screen to measurable improvement.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SERVICE_TIERS.map((tier) => (
          <div
            key={tier.slug}
            className="flex flex-col rounded-2xl border border-brand-100 bg-white p-6"
          >
            <h2 className="font-serif text-xl font-semibold text-brand-900">
              {tier.name}
            </h2>
            <p className="mt-2 text-sm text-brand-600">{tier.tagline}</p>

            {SHOW_PRICING && (
              <p className="mt-4 text-sm font-semibold text-accent-700">
                {priceLabel(tier.priceGBP, tier.priceINR)}
              </p>
            )}

            <ul className="mt-4 flex-1 space-y-2">
              {tier.includes.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm text-brand-600"
                >
                  <span aria-hidden className="text-accent-500">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {tier.priceGBP === 0 ? (
                <ButtonLink
                  href="/calculator"
                  variant="secondary"
                  className="w-full"
                >
                  Start free
                </ButtonLink>
              ) : PAYMENTS_ENABLED ? (
                <CheckoutButton slug={tier.slug} />
              ) : (
                <ButtonLink href="/contact" variant="secondary" className="w-full">
                  Enquire
                </ButtonLink>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-brand-400">
        {SHOW_PRICING
          ? "Prices are indicative and shown in GBP and INR. Final scope is agreed per engagement."
          : "Pricing is shared on enquiry and tailored to your organisation’s size and scope."}
      </p>
    </Container>
  );
}
