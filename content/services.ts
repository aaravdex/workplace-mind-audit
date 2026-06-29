/**
 * The five service tiers. Shared by the Services page (Phase 7) and the PDF
 * report's closing page. Prices are placeholders, shown only when public pricing
 * is enabled (NEXT_PUBLIC_ENABLE_PUBLIC_PRICING). `priceGBP: 0` renders as Free.
 */
export interface ServiceTier {
  slug: string;
  name: string;
  tagline: string;
  includes: string[];
  priceGBP: number;
  priceINR: number;
}

export const SERVICE_TIERS: ServiceTier[] = [
  {
    slug: "burnout-cost-report",
    name: "Burnout Cost Report",
    tagline: "A boardroom-ready figure for what burnout is costing you.",
    includes: [
      "Full burnout-cost breakdown",
      "Benchmarked risk level",
      "Branded PDF deliverable",
    ],
    priceGBP: 0,
    priceINR: 0,
  },
  {
    slug: "workplace-mind-audit",
    name: "Workplace Mind Audit",
    tagline: "The anonymous 5C survey, full dashboard, and consulting report.",
    includes: [
      "Anonymous 25-question 5C survey",
      "Five-view live dashboard",
      "Consulting-grade PDF report",
      "Department comparison (anonymity-safe)",
    ],
    priceGBP: 1200,
    priceINR: 120000,
  },
  {
    slug: "leadership-debrief",
    name: "Leadership Debrief",
    tagline: "A facilitated session that turns findings into decisions.",
    includes: [
      "90-minute leadership workshop",
      "Prioritised intervention roadmap",
      "Q&A with the analyst",
    ],
    priceGBP: 900,
    priceINR: 90000,
  },
  {
    slug: "manager-training",
    name: "Manager Training Workshop",
    tagline: "Practical manager skills targeted at your risk areas.",
    includes: [
      "Half-day workshop",
      "Supportive 1:1 and workload-triage skills",
      "Psychological-safety practices",
    ],
    priceGBP: 1500,
    priceINR: 150000,
  },
  {
    slug: "90-day-intervention",
    name: "90-Day Wellbeing Intervention",
    tagline: "A hands-on change programme with measured outcomes.",
    includes: [
      "Baseline + 90-day re-audit",
      "Monthly working sessions",
      "Outcome measurement and report",
    ],
    priceGBP: 6000,
    priceINR: 600000,
  },
];
