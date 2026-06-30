import { createHash } from "node:crypto";

/**
 * Lightweight request-layer abuse protection. NOTHING here is ever written to a
 * data row — IPs are hashed transiently for keying and discarded. This keeps the
 * `responses` table free of PII while still blocking trivial spam.
 *
 * LIMITATION (documented): the rate-limit store is in-memory and per-instance.
 * It resets on deploy and is not shared across serverless instances, so it is a
 * coarse deterrent, not a hard guarantee. For production scale, back this with
 * Redis/Upstash. The per-browser cookie guard (see /api/responses) is the
 * primary duplicate-submission defence.
 */

const SALT = process.env.RATE_LIMIT_SALT ?? "wma-dev-salt";

/** Transient, salted hash of the caller IP. Used only as a rate-limit key. */
export function hashIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip =
    fwd.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex").slice(0, 16);
}

/** Short, opaque hash of a value (e.g. a public token) for cookie/key names. */
export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** Fixed-window in-memory rate limit. Returns ok:false once `max` is exceeded. */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Bound memory: if the map grows large, drop expired entries.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > max) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}
