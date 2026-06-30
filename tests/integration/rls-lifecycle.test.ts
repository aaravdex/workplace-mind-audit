import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * LIVE integration + RLS suite. Skips cleanly when Supabase isn't configured, so
 * it never breaks the pure-logic suite. Run it once `.env.local` has the three
 * Supabase values (e.g. `node --env-file=.env.local node_modules/.bin/vitest run
 * tests/integration`).
 *
 * The single most important assertion here is RLS isolation: Org A's owner must
 * NOT be able to read Org B's audits, responses, scores, or annotations. If that
 * fails, the product is not safe to pilot.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(URL && ANON && SERVICE);

if (!configured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] SKIPPED — set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local to run the live RLS suite.",
  );
}

const ANSWERS = Object.fromEntries(
  Array.from({ length: 25 }, (_, i) => [String(i + 1), 4]),
);

describe.skipIf(!configured)("live RLS + lifecycle", () => {
  let admin: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let anon: SupabaseClient;
  const stamp = Date.now();
  const emailA = `pilot-a-${stamp}@example.test`;
  const emailB = `pilot-b-${stamp}@example.test`;
  const password = "Test-Passw0rd!";
  let userAId = "";
  let userBId = "";
  let orgAId = "";
  let auditAId = "";
  let auditAsmallId = "";
  let orgBId = "";
  let auditBId = "";
  const benchKey = { sector: `ZZ-Test-${stamp}`, size: "50-199" };

  beforeAll(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    admin = createClient(URL!, SERVICE!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    anon = createClient(URL!, ANON!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Two confirmed users.
    const a = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    const b = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    userAId = a.data.user!.id;
    userBId = b.data.user!.id;

    clientA = createClient(URL!, ANON!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientB = createClient(URL!, ANON!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await clientA.auth.signInWithPassword({ email: emailA, password });
    await clientB.auth.signInWithPassword({ email: emailB, password });

    // Org A + audits (inserted AS user A — exercises RLS with-check on insert).
    const orgA = await clientA
      .from("organisations")
      .insert({ name: "Org A", sector: benchKey.sector, size_band: benchKey.size, owner_user_id: userAId })
      .select("id")
      .single();
    orgAId = orgA.data!.id;
    const auditA = await clientA
      .from("audits")
      .insert({ org_id: orgAId, title: "Audit A", status: "open" })
      .select("id")
      .single();
    auditAId = auditA.data!.id;
    const auditAsmall = await clientA
      .from("audits")
      .insert({ org_id: orgAId, title: "Audit A small", status: "open" })
      .select("id")
      .single();
    auditAsmallId = auditAsmall.data!.id;

    // Org B + audit (as user B).
    const orgB = await clientB
      .from("organisations")
      .insert({ name: "Org B", sector: benchKey.sector, size_band: benchKey.size, owner_user_id: userBId })
      .select("id")
      .single();
    orgBId = orgB.data!.id;
    const auditB = await clientB
      .from("audits")
      .insert({ org_id: orgBId, title: "Audit B", status: "open" })
      .select("id")
      .single();
    auditBId = auditB.data!.id;

    // Responses inserted via service role (mirrors /api/responses): 6 to audit A,
    // 3 to the small audit, and some to audit B.
    const rows = (auditId: string, n: number) =>
      Array.from({ length: n }, () => ({ audit_id: auditId, segment: null, answers: ANSWERS }));
    await admin.from("responses").insert([
      ...rows(auditAId, 6),
      ...rows(auditAsmallId, 3),
      ...rows(auditBId, 6),
    ]);

    // Consultant annotation for audit A (admin write).
    await admin.from("audit_annotations").upsert(
      { audit_id: auditAId, executive_summary_note: "secret A note", dimension_notes: {} },
      { onConflict: "audit_id" },
    );

    // Benchmark snapshots: one below threshold, one at it.
    const dist = { p10: 30, p25: 45, p50: 55, p75: 68, p90: 80 };
    await admin.from("benchmark_snapshots").upsert(
      [
        { sector: benchKey.sector, size_band: benchKey.size, dimension: "capacity", percentile_data: dist, n_companies: 5 },
        { sector: benchKey.sector, size_band: benchKey.size, dimension: "clarity", percentile_data: dist, n_companies: 8 },
      ],
      { onConflict: "sector,size_band,dimension" },
    );
  }, 30000);

  afterAll(async () => {
    if (!admin) return;
    await admin.from("benchmark_snapshots").delete().eq("sector", benchKey.sector);
    if (userAId) await admin.auth.admin.deleteUser(userAId); // cascades org/audits/responses
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("stores responses with NO PII / user_id (anonymity is architectural)", async () => {
    const { data } = await clientA
      .from("responses")
      .select("*")
      .eq("audit_id", auditAId)
      .limit(1);
    const row = data?.[0] ?? {};
    expect(Object.keys(row).sort()).toEqual(
      ["answers", "audit_id", "id", "segment", "submitted_at"].sort(),
    );
    expect(row).not.toHaveProperty("user_id");
    expect(row).not.toHaveProperty("email");
    expect(row).not.toHaveProperty("ip");
  });

  it("lets Org A read its OWN audit and responses", async () => {
    const audit = await clientA.from("audits").select("id").eq("id", auditAId).maybeSingle();
    expect(audit.data?.id).toBe(auditAId);
    const resp = await clientA.from("responses").select("id").eq("audit_id", auditAId);
    expect((resp.data ?? []).length).toBe(6);
  });

  it("BLOCKS Org A from reading Org B's audit, responses, and annotations (the RLS gate)", async () => {
    const bAudit = await clientA.from("audits").select("id").eq("id", auditBId);
    expect(bAudit.data ?? []).toHaveLength(0);

    const bResponses = await clientA.from("responses").select("id").eq("audit_id", auditBId);
    expect(bResponses.data ?? []).toHaveLength(0);

    const bAnnotations = await clientA
      .from("audit_annotations")
      .select("executive_summary_note")
      .eq("audit_id", auditBId);
    expect(bAnnotations.data ?? []).toHaveLength(0);

    // And the reverse direction.
    const aFromB = await clientB.from("responses").select("id").eq("audit_id", auditAId);
    expect(aFromB.data ?? []).toHaveLength(0);
  });

  it("fires min-N suppression on a real query (and survives the org-join shape)", async () => {
    const { buildAuditScores } = await import("@/lib/scores-service");
    const big = await buildAuditScores(clientA, auditAId);
    const small = await buildAuditScores(clientA, auditAsmallId);
    expect(big?.sufficient).toBe(true);
    expect(big?.audit.orgName).toBe("Org A"); // the flagged cast resolves correctly
    expect(big?.overall).not.toBeNull();
    expect(small?.sufficient).toBe(false);
    expect(small?.overall).toBeNull();
  });

  it("hides benchmark cells below MIN_COMPANIES_PER_BENCHMARK (8) from public reads", async () => {
    const below = await anon
      .from("benchmark_snapshots")
      .select("dimension")
      .eq("sector", benchKey.sector)
      .eq("dimension", "capacity"); // n=5
    expect(below.data ?? []).toHaveLength(0);

    const atOrAbove = await anon
      .from("benchmark_snapshots")
      .select("dimension")
      .eq("sector", benchKey.sector)
      .eq("dimension", "clarity"); // n=8
    expect((atOrAbove.data ?? []).length).toBe(1);
  });
});
