import { NextResponse } from "next/server";

// POST: create an audit for the authenticated org owner. Requires Supabase auth
// and RLS (Phase 3).
export async function POST() {
  return NextResponse.json(
    { error: "Not implemented yet", phase: "Phase 3" },
    { status: 501 },
  );
}
