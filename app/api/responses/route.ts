import { NextResponse } from "next/server";

// POST: submit ONE anonymous survey response (audit public_token + optional
// segment + answers payload). No user_id, no PII. Inserted under RLS by anyone
// holding the token. Implemented in Phase 4.
export async function POST() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 4" },
    { status: 501 },
  );
}
