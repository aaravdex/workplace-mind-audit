/**
 * Payments feature flag. The whole subsystem is off unless ENABLE_PAYMENTS is
 * "true" AND a Stripe secret key is present — so launch is never blocked on
 * billing, and the build runs with no Stripe config at all.
 */
export const ENABLE_PAYMENTS = process.env.ENABLE_PAYMENTS === "true";

export function isPaymentsConfigured(): boolean {
  return ENABLE_PAYMENTS && Boolean(process.env.STRIPE_SECRET_KEY);
}
