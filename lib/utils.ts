import type { Currency } from "@/types";
import { CURRENCY_META } from "@/lib/constants";

/**
 * Tiny class-name joiner. Filters falsy values so conditional classes read
 * cleanly: cn("base", active && "is-active"). Dependency-free on purpose —
 * we can swap in clsx/tailwind-merge later if class conflicts become an issue.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Round to 1 decimal place (used for percentages). */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Round to 2 decimal places (used for the daily-salary rate). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Format a whole-currency amount for display. Uses the locale tied to each
 * currency so INR renders in lakh grouping (₹1,00,000) and GBP in thousands.
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const { locale } = CURRENCY_META[currency];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
