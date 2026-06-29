"use client";

import { useState } from "react";

/** Starts a Stripe Checkout session and redirects to it. */
export function CheckoutButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function onClick() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL");
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="h-10 w-full rounded-md bg-accent-500 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Buy now"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">
          Could not start checkout. Please try again.
        </p>
      )}
    </div>
  );
}
