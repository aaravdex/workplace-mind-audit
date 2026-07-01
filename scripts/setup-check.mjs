#!/usr/bin/env node
// Pre-flight check for the live Supabase backend.  Run: npm run setup:check
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

const TABLES = [
  "organisations",
  "audits",
  "responses",
  "leads",
  "calculator_runs",
  "audit_annotations",
  "benchmark_snapshots",
];

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function main() {
  const hasFile = loadEnvLocal();
  if (!hasFile) fail("No .env.local found. Copy .env.example to .env.local and add your Supabase values.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", url],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anon],
    ["SUPABASE_SERVICE_ROLE_KEY", service],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) fail(`.env.local is missing: ${missing.join(", ")}`);

  console.log("✓ .env.local has all three Supabase values");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Connectivity + table presence. A real row-returning select is used (NOT a
  // head/count probe, which can mask a missing table as a non-error).
  let connected = false;
  const present = [];
  const absent = [];
  const isMissing = (e) =>
    e.code === "42P01" ||
    e.code === "PGRST205" ||
    /does not exist|schema cache/i.test(e.message ?? "");
  for (const t of TABLES) {
    const { error } = await admin.from(t).select("id").limit(1);
    if (!error) {
      connected = true;
      present.push(t);
    } else if (isMissing(error)) {
      connected = true; // we reached Postgres; the table just isn't there yet
      absent.push(t);
    } else {
      fail(`Could not connect to Supabase (${t}): ${error.message}`);
    }
  }

  if (!connected) fail("Could not connect to Supabase with the service role key.");
  console.log("✓ Connected to Supabase");

  if (absent.length === 0) {
    console.log(`✓ All ${TABLES.length} tables present: ${present.join(", ")}`);
    console.log("\n✅ Ready. Next: `npm run seed:demo` to populate the Northwind example, then `npm run dev`.\n");
    return;
  }

  console.log(`\n⚠️  Missing tables: ${absent.join(", ")}`);
  console.log("\nApply the migrations, then re-run this check. Either:");
  console.log("  • Supabase CLI:  supabase db push");
  console.log("  • Or paste, in order, into the SQL editor (Dashboard → SQL):");
  console.log("      supabase/migrations/0001_init.sql");
  console.log("      supabase/migrations/0002_rls.sql");
  console.log("      supabase/migrations/0003_benchmark_annotations.sql");
  console.log("      supabase/migrations/0004_audit_cost_inputs.sql");
  console.log("");
  process.exit(2);
}

main().catch((e) => fail(e?.message ?? String(e)));
