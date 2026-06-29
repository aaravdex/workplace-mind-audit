import { NextResponse } from "next/server";

// PUT: upsert the consultant's bespoke interpretation (audit_annotations).
// Writable only by a user with the `consultant` role claim. Implemented in
// Phase 8.
export async function PUT() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 8" },
    { status: 501 },
  );
}
