import { NextResponse } from "next/server";

// GET: computed 5C scores for an audit (auth, org-owner only). Aggregates
// server-side and REFUSES to return any segment with fewer than
// MIN_RESPONSES_PER_SEGMENT responses. Implemented in Phase 5.
export async function GET() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 5" },
    { status: 501 },
  );
}
