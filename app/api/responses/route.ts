import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTIONS } from "@/content/questions";

/**
 * POST: submit ONE anonymous survey response. No user_id, no PII — only the
 * answer payload, an optional (validated) segment, and a timestamp.
 *
 * Flow: validate token → resolve the audit (must be OPEN) → sanitise answers to
 * known question ids and the segment to the audit's controlled list → insert via
 * the service role (anonymous submit, no auth). The token is the only secret a
 * respondent needs, satisfying "anyone with the token can submit".
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
  const cleanSegment =
    segment && allowed.includes(segment) ? segment : null;

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

  return NextResponse.json({ ok: true }, { status: 201 });
}
