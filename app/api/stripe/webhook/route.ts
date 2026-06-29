import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST: Stripe webhook. Verifies the signature against STRIPE_WEBHOOK_SECRET and
 * acknowledges events (e.g. checkout.session.completed). Fulfilment hooks can be
 * added here later. No-ops cleanly when payments are unconfigured.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Payments are not enabled" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    if (event.type === "checkout.session.completed") {
      // Fulfilment hook (record the purchase, email a receipt, etc.).
      console.info("[stripe] checkout completed:", event.id);
    }
  } catch (err) {
    console.error("[stripe] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
