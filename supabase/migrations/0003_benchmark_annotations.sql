-- ─────────────────────────────────────────────────────────────────────────────
-- 0003_benchmark_annotations.sql — the benchmark-moat upgrade
--
-- Adds: org sector/size segmentation, the human-authored annotation layer, and
-- the materialised benchmark pool. Two anonymity guards live at the DB level:
--   • benchmark_snapshots are world-readable ONLY where n_companies >= 8.
--   • audit_annotations are writable only by a user with the `consultant` claim.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── organisations: sector + size band for benchmark segmentation ──────────────
alter table public.organisations
  add column if not exists sector text,
  add column if not exists size_band text;
-- Controlled lists live in lib/constants.ts (SECTORS, SIZE_BANDS) and are
-- validated at the API boundary with Zod; kept as text here so the lists can
-- evolve without a migration.

-- ── audit_annotations: the human-authored interpretation layer ────────────────
create table if not exists public.audit_annotations (
  id                     uuid primary key default gen_random_uuid(),
  audit_id               uuid not null unique references public.audits (id) on delete cascade,
  executive_summary_note text,
  -- { capacity: "...", clarity: "...", ... } — optional per-dimension notes
  dimension_notes        jsonb not null default '{}'::jsonb,
  author_user_id         uuid references auth.users (id),
  updated_at             timestamptz not null default now()
);

-- ── benchmark_snapshots: periodically materialised aggregate (NEVER raw rows) ──
create table if not exists public.benchmark_snapshots (
  id              uuid primary key default gen_random_uuid(),
  sector          text not null,
  size_band       text not null,
  dimension       text not null,
  -- { p10, p25, p50, p75, p90 } score-domain percentile anchors
  percentile_data jsonb not null,
  n_companies     int not null,
  computed_at     timestamptz not null default now(),
  unique (sector, size_band, dimension)
);

-- ── consultant role helper ────────────────────────────────────────────────────
-- Reads the `consultant` role from the JWT. Set it on your own user via the
-- Supabase dashboard (Authentication → user → app_metadata: { "role":
-- "consultant" }). Checks both app_metadata.role and a top-level user_role claim.
create or replace function public.is_consultant()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'consultant',
    (auth.jwt() ->> 'user_role') = 'consultant',
    false
  );
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.audit_annotations  enable row level security;
alter table public.benchmark_snapshots enable row level security;

-- audit_annotations: the audit's org owner OR a consultant may read;
-- only consultants may write (this is the human-authored read you inject).
drop policy if exists "annotations_select" on public.audit_annotations;
create policy "annotations_select" on public.audit_annotations
  for select to authenticated
  using (
    public.is_consultant()
    or exists (
      select 1 from public.audits a
      join public.organisations o on o.id = a.org_id
      where a.id = audit_annotations.audit_id and o.owner_user_id = auth.uid()
    )
  );

drop policy if exists "annotations_insert" on public.audit_annotations;
create policy "annotations_insert" on public.audit_annotations
  for insert to authenticated
  with check (public.is_consultant());

drop policy if exists "annotations_update" on public.audit_annotations;
create policy "annotations_update" on public.audit_annotations
  for update to authenticated
  using (public.is_consultant())
  with check (public.is_consultant());

-- benchmark_snapshots: world-readable, but ONLY rows computed from at least 8
-- distinct organisations (mirrors MIN_COMPANIES_PER_BENCHMARK). Writes happen
-- via the service-role materialiser, which bypasses RLS.
drop policy if exists "benchmark_public_read" on public.benchmark_snapshots;
create policy "benchmark_public_read" on public.benchmark_snapshots
  for select to anon, authenticated
  using (n_companies >= 8);
