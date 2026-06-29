import { NextResponse } from "next/server";

// GET: audit-adjusted cost — THE LOOP. Re-derives the financial figure from the
// audit's real 5C scores (bounded ±cap) and returns generic vs adjusted + delta.
// Implemented in Phase 6.
export async function GET() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 6" },
    { status: 501 },
  );
}
