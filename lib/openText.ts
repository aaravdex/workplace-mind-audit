/**
 * OPEN-TEXT ANALYSIS (Phase 7A, pure + privacy-critical).
 *
 * Deterministic keyword theme clustering — NO LLM. Redaction strips the obvious
 * identifying patterns (emails, phone numbers, URLs, @handles) before anything
 * is stored or shown. Verbatims are withheld unless there are enough responses
 * AND the client permits them; below that, themes render as counts + paraphrase
 * only. Free-text detection of names is NOT reliably deterministic, so the design
 * leans on: redaction of clear PII, no small-N verbatims, and a no-verbatims mode.
 */

export interface OpenTextQuestion {
  id: number;
  text: string;
}

/** Optional free-text questions (ids 201+ never collide with the Likert bank). */
export const OPEN_TEXT_QUESTIONS: OpenTextQuestion[] = [
  { id: 201, text: "What is the single greatest avoidable source of pressure in your work?" },
  { id: 202, text: "If we could stop one thing, what should it be?" },
  { id: 203, text: "What is one thing your manager could do differently?" },
  { id: 204, text: "What helps you perform at your best?" },
  { id: 205, text: "Anything else we haven't asked about?" },
];

const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const PHONE = /\b\+?\d[\d\s().-]{7,}\d\b/g;
const HANDLE = /(^|\s)@\w+/g;

/** Strip clear identifying patterns before storage or display. */
export function redactOpenText(text: string): string {
  return text
    .replace(EMAIL, "[redacted]")
    .replace(URL, "[redacted]")
    .replace(PHONE, "[redacted]")
    .replace(HANDLE, "$1[redacted]")
    .trim();
}

export interface OpenTextTheme {
  theme: string;
  count: number;
  sentiment: "negative" | "mixed" | "positive";
  /** Redacted, short verbatims — only when permitted AND sample is large enough. */
  sampleQuotes: string[];
}

const THEMES: { theme: string; keywords: string[] }[] = [
  { theme: "Workload & hours", keywords: ["workload", "hours", "overtime", "deadline", "too much", "busy", "capacity", "pace", "rushed", "overwhelm", "understaffed", "staffing"] },
  { theme: "Priorities & clarity", keywords: ["unclear", "priorities", "priority", "conflicting", "confusing", "direction", "focus", "expectations"] },
  { theme: "Management & autonomy", keywords: ["manager", "management", "micromanage", "autonomy", "trust", "oversight"] },
  { theme: "Recognition & fairness", keywords: ["recognition", "recognised", "valued", "appreciated", "fair", "unfair", "reward", "pay"] },
  { theme: "Communication & voice", keywords: ["communication", "communicate", "informed", "voice", "heard", "listened", "feedback", "transparency"] },
  { theme: "Tools & process", keywords: ["tools", "process", "systems", "meetings", "admin", "bureaucracy", "red tape"] },
  { theme: "Support & wellbeing", keywords: ["support", "wellbeing", "stress", "burnout", "exhausted", "recovery", "flexibility", "flexible"] },
];

const POSITIVE = ["good", "great", "love", "enjoy", "positive", "helpful", "flexible", "supportive", "appreciate", "valued", "clear"];
const NEGATIVE = ["too much", "unclear", "stress", "burnout", "exhausted", "unfair", "overwhelm", "confusing", "micromanage", "understaffed", "impossible", "pressure"];

const MIN_VERBATIM_SAMPLE = 5;

/**
 * Cluster open-text answers into themes with counts and sentiment. Verbatims are
 * withheld unless `allowVerbatims` AND there are at least max(reportingThreshold,
 * MIN_VERBATIM_SAMPLE) answers — never small-N quotes.
 */
export function clusterOpenText(
  entries: { text: string; segment: string | null }[],
  opts: { reportingThreshold: number; allowVerbatims: boolean },
): OpenTextTheme[] {
  const buckets = new Map<string, { count: number; pos: number; neg: number; quotes: string[] }>();
  for (const e of entries) {
    const t = e.text.toLowerCase();
    const pos = POSITIVE.filter((w) => t.includes(w)).length;
    const neg = NEGATIVE.filter((w) => t.includes(w)).length;
    for (const { theme, keywords } of THEMES) {
      if (!keywords.some((k) => t.includes(k))) continue;
      const b = buckets.get(theme) ?? { count: 0, pos: 0, neg: 0, quotes: [] };
      b.count += 1;
      b.pos += pos;
      b.neg += neg;
      b.quotes.push(redactOpenText(e.text));
      buckets.set(theme, b);
    }
  }

  const allowQuotes =
    opts.allowVerbatims &&
    entries.length >= Math.max(opts.reportingThreshold, MIN_VERBATIM_SAMPLE);

  const out: OpenTextTheme[] = [];
  for (const [theme, b] of buckets) {
    out.push({
      theme,
      count: b.count,
      sentiment: b.neg > b.pos ? "negative" : b.pos > b.neg ? "positive" : "mixed",
      sampleQuotes: allowQuotes ? b.quotes.filter((q) => q.length <= 160).slice(0, 2) : [],
    });
  }
  return out.sort((a, b) => b.count - a.count);
}
