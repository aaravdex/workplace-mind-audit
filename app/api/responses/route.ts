import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTIONS } from "@/content/questions";
import { hashIp, rateLimit, shortHash } from "@/lib/rate-limit";

/**
 * POST: submit ONE anonymous survey response. No user_id, no PII — only the
 * answer payload, an optional (validated) segment, and a timestamp.
 *
 * Flow: rate-limit + per-browser duplicate guard → validate token → resolve the
 * audit (must be OPEN) → sanitise answers to known question ids and the segment
 * to the audit's controlled list → insert via the service role (anonymous
 * submit, no auth).
 *
 * DUPLICATE GUARD (anonymity-preserving): on first submit we set a signed,
 * httpOnly cookie scoped to a HASH of the audit's public token. A second submit
 * from the same browser is blocked. Nothing identifying is written to the row.
 * Residual limitation: clearing cookies / a different browser / incognito can
 * bypass it; the coarse per-IP-hash rate limit (transient, never stored) is the
 * backstop. See README → "Anonymity & abuse protection".
 */
const LikertOrNull = z.union([z.number().int().min(1).max(5), z.null()]);

const ResponseSchema = z.object({
  token: z.string().uuid(),
  segment: z.union([z.string().trim().min(1), z.null()]).optional(),
  answers: z.record(z.string(), LikertOrNull),
});

export async function POST(request: Request) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Survey storage is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid response", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { token, segment, answers } = parsed.data;

  const tokenHash = shortHash(token);
  const cookieName = `wmar_${tokenHash}`;

  // 1) Per-browser duplicate guard.
  if (cookies().get(cookieName)) {
    return NextResponse.json(
      { error: "You have already submitted this survey from this browser." },
      { status: 409 },
    );
  }

  // 2) Coarse per-IP-hash rate limit (IP hashed transiently, never stored).
  const limit = rateLimit(`resp:${tokenHash}:${hashIp(request)}`, 5, 60 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { data: audit } = await admin
    .from("audits")
    .select("id, status, segments")
    .eq("public_token", token)
    .maybeSingle();

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }
  if (audit.status !== "open") {
    return NextResponse.json(
      { error: "This audit is not currently accepting responses" },
      { status: 409 },
    );
  }

  // Only persist answers for known question ids (defends against arbitrary keys).
  const cleanAnswers: Record<number, number | null> = {};
  for (const q of QUESTIONS) {
    const value = answers[String(q.id)];
    cleanAnswers[q.id] = typeof value === "number" ? value : null;
  }

  // Only accept a segment from the audit's controlled list; otherwise anonymous.
  const allowed: string[] = audit.segments ?? [];
  const cleanSegment = segment && allowed.includes(segment) ? segment : null;

  const { error } = await admin.from("responses").insert({
    audit_id: audit.id,
    segment: cleanSegment,
    answers: cleanAnswers,
  });

  if (error) {
    console.error("[responses] insert failed:", error);
    return NextResponse.json(
      { error: "Could not save your response" },
      { status: 500 },
    );
  }

  // Mark this browser as having submitted THIS audit (hashed token only).
  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(cookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return response;
}
