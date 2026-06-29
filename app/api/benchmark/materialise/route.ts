import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { materialiseBenchmarks } from "@/lib/benchmark-service";

export const dynamic = "force-dynamic";

/**
 * POST: recompute all benchmark_snapshots. Consultant-only (the role that owns
 * the benchmark). Intended to be triggered on a schedule (cron) or manually.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.app_metadata as { role?: string } | undefined)?.role;
  if (!user || role !== "consultant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 503 },
    );
  }

  const summary = await materialiseBenchmarks(admin);
  return NextResponse.json({ ok: true, ...summary });
}
