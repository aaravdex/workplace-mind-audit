import "server-only";
import Stripe from "stripe";
import { SERVICE_TIERS } from "@/content/services";
import { isPaymentsConfigured } from "@/lib/payments";

/** Lazily construct the Stripe client; null when unconfigured. Server-only. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!isPaymentsConfigured() || !key) return null;
  return new Stripe(key);
}

/**
 * Create a Checkout Session for a paid service tier using inline price_data
 * (no pre-created Stripe Prices needed). Returns the redirect URL, or null when
 * payments are off or the tier is free/unknown.
 */
export async function createCheckoutSessionForTier(
  slug: string,
  origin: string,
): Promise<string | null> {
  const stripe = getStripe();
  const tier = SERVICE_TIERS.find((t) => t.slug === slug);
  if (!stripe || !tier || tier.priceGBP <= 0) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: tier.priceGBP * 100,
          product_data: { name: tier.name, description: tier.tagline },
        },
      },
    ],
    success_url: `${origin}/services?checkout=success`,
    cancel_url: `${origin}/services?checkout=cancelled`,
  });

  return session.url;
}
