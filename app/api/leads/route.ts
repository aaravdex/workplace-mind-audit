import { NextResponse } from "next/server";

// POST: store a qualified lead (consenting marketing data) and email the full
// PDF report via lib/email.ts. Kept separate from anonymous survey responses.
// Implemented in Phase 2.
export async function POST() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 2" },
    { status: 501 },
  );
}
