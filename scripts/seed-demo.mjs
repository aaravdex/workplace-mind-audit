#!/usr/bin/env node
// Seeds the Northwind Software demo into YOUR live Supabase. Run: npm run seed:demo
// Uses only the keys in .env.local; never transmits secrets anywhere else.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return false;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
  return true;
}

// ── Deterministic respondent generation (mirrors the real survey shape) ──
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const noise = (s) => (rnd() * 2 - 1) * s;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const REVERSE = new Set([3, 5, 9, 10, 14]);
const DIM_OF = (id) =>
  id <= 5 ? "capacity" : id <= 10 ? "clarity" : id <= 15 ? "control" : id <= 20 ? "connection" : "confidence";
const TARGET = { capacity: 41, clarity: 63, control: 58, connection: 44, confidence: 52 };
const BIAS = { Engineering: -11, Sales: 8, "Customer Success": 1, Product: -3, Leadership: 2 };
const ROSTER = [["Engineering", 14], ["Sales", 9], ["Customer Success", 6], ["Product", 4], ["Leadership", 3], [null, 4]];

function answer(target, reverse) {
  if (rnd() < 0.05) return null;
  const v = clamp(target + noise(14), 0, 100);
  const raw = reverse ? 5 - v / 25 : v / 25 + 1;
  return clamp(Math.round(raw), 1, 5);
}
function buildResponses(auditId) {
  const out = [];
  for (const [segment, count] of ROSTER) {
    const bias = segment ? BIAS[segment] ?? 0 : 0;
    for (let i = 0; i < count; i++) {
      const answers = {};
      for (let id = 1; id <= 25; id++) answers[id] = answer(TARGET[DIM_OF(id)] + bias, REVERSE.has(id));
      out.push({ audit_id: auditId, segment, answers });
    }
  }
  return out;
}

// Benchmark distributions (per dimension) for the SaaS / 50-199 peer pool.
const DIST = {
  capacity: { p10: 30, p25: 45, p50: 55, p75: 66, p90: 78 },
  clarity: { p10: 40, p25: 52, p50: 62, p75: 72, p90: 82 },
  control: { p10: 38, p25: 50, p50: 60, p75: 70, p90: 80 },
  connection: { p10: 32, p25: 46, p50: 56, p75: 67, p90: 79 },
  confidence: { p10: 35, p25: 48, p50: 58, p75: 69, p90: 80 },
};

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users?.find((x) => x.email === email);
    if (u) return u;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function main() {
  if (!loadEnvLocal()) fail("No .env.local found.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (!url || !service) fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = "northwind-owner@example.test";
  const password = "Northwind-Demo-1!";

  // Owner user (create or reuse).
  let user = await findUserByEmail(admin, email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) fail(`Could not create demo user: ${error.message}`);
    user = data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, { password });
  }
  console.log(`✓ Demo owner: ${email}  /  ${password}`);

  // Fresh org (delete prior demo org for this owner → cascades audits/responses).
  await admin.from("organisations").delete().eq("owner_user_id", user.id).eq("name", "Northwind Software");
  const { data: org, error: orgErr } = await admin
    .from("organisations")
    .insert({ name: "Northwind Software", industry: "B2B SaaS", sector: "SaaS / Software", size_band: "50-199", owner_user_id: user.id })
    .select("id")
    .single();
  if (orgErr) fail(`Org insert failed: ${orgErr.message}`);

  const { data: audit, error: auditErr } = await admin
    .from("audits")
    .insert({ org_id: org.id, title: "Q3 Wellbeing Audit", status: "open", opened_at: new Date().toISOString(), segments: ["Engineering", "Sales", "Customer Success", "Product", "Leadership"] })
    .select("id, public_token")
    .single();
  if (auditErr) fail(`Audit insert failed: ${auditErr.message}`);

  const responses = buildResponses(audit.id);
  const { error: respErr } = await admin.from("responses").insert(responses);
  if (respErr) fail(`Responses insert failed: ${respErr.message}`);
  console.log(`✓ Inserted ${responses.length} anonymous responses`);

  // Benchmark pool (n=14 ≥ 8 so it renders).
  const snaps = Object.entries(DIST).map(([dimension, percentile_data]) => ({
    sector: "SaaS / Software",
    size_band: "50-199",
    dimension,
    percentile_data,
    n_companies: 14,
  }));
  await admin.from("benchmark_snapshots").upsert(snaps, { onConflict: "sector,size_band,dimension" });
  console.log("✓ Seeded benchmark pool (14 peer orgs)");

  // Consultant annotation.
  await admin.from("audit_annotations").upsert(
    {
      audit_id: audit.id,
      executive_summary_note:
        "The Capacity and Connection gaps concentrate in Engineering, tracking the two senior departures and the Q2 release crunch. Treat this as a workload-and-support problem, not a perks problem.",
      dimension_notes: {
        capacity: "Engineering has been on a release sprint for nine weeks; protect recovery time first.",
        connection: "Re-establish manager 1:1 cadence after the two senior departures.",
      },
    },
    { onConflict: "audit_id" },
  );
  console.log("✓ Added consultant annotation");

  console.log("\n✅ Seeded. Now:");
  console.log(`   1. npm run dev`);
  console.log(`   2. Sign in at ${siteUrl}/login as ${email} / ${password}`);
  console.log(`   3. Dashboard:   ${siteUrl}/dashboard/${audit.id}`);
  console.log(`   4. Survey link: ${siteUrl}/survey/${audit.public_token}`);
  console.log("");
}

main().catch((e) => fail(e?.message ?? String(e)));
