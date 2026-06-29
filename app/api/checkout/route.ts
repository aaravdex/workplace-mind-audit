import { NextResponse } from "next/server";
import { z } from "zod";
import { isPaymentsConfigured } from "@/lib/payments";
import { createCheckoutSessionForTier } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const CheckoutSchema = z.object({ slug: z.string().min(1) });

/** POST: start a Stripe Checkout session for a paid service tier. */
export async function POST(request: Request) {
  if (!isPaymentsConfigured()) {
    return NextResponse.json(
      { error: "Payments are not enabled" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  try {
    const url = await createCheckoutSessionForTier(parsed.data.slug, origin);
    if (!url) {
      return NextResponse.json(
        { error: "That tier is not purchasable" },
        { status: 400 },
      );
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[checkout] failed to create session:", err);
    return NextResponse.json(
      { error: "Could not start checkout" },
      { status: 500 },
    );
  }
}
