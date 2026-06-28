import { NextResponse } from "next/server";

// GET: streams a consulting-grade PDF (application/pdf) for an audit, via
// @react-pdf/renderer. Auth, org-owner only. Implemented in Phase 6.
export async function GET() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 6" },
    { status: 501 },
  );
}
