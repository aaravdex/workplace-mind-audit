-- ─────────────────────────────────────────────────────────────────────────────
-- 0001_init.sql — Workplace Mind Audit schema
--
-- Design notes baked into the structure:
--   • `responses` has NO user_id and NO PII column. Anonymity is architectural:
--     identity is simply never collected, so it cannot leak or be subpoenaed.
--   • `leads` (consenting marketing data) is a SEPARATE table from `responses`
--     (anonymous survey data). The ethical boundary is literal in the schema.
--   • An org owns many audits (repeat business — e.g. a Q1 and a Q3 audit).
--   • `public_token` is the unguessable value used in the public survey URL.
-- RLS is enabled and policed in 0002_rls.sql.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto"; -- provides gen_random_uuid()

-- Audit lifecycle.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_status') then
    create type public.audit_status as enum ('draft', 'open', 'closed');
  end if;
end $$;

-- ── organisations ─────────────────────────────────────────────────────────────
create table if not exists public.organisations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  industry      text,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- ── audits ────────────────────────────────────────────────────────────────────
create table if not exists public.audits (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations (id) on delete cascade,
  title        text not null,
  status       public.audit_status not null default 'draft',
  public_token uuid not null unique default gen_random_uuid(),
  -- Controlled list of department/segment options the org owner offers.
  segments     text[] not null default '{}',
  opened_at    timestamptz,
  closed_at    timestamptz,
  created_at   timestamptz not null default now()
);

-- ── responses (anonymous — NO user_id, NO PII) ────────────────────────────────
create table if not exists public.responses (
  id           uuid primary key default gen_random_uuid(),
  audit_id     uuid not null references public.audits (id) on delete cascade,
  -- Optional department tag, or null for "Prefer not to say".
  segment      text,
  -- { "<questionId>": 1..5 | null }
  answers      jsonb not null,
  submitted_at timestamptz not null default now()
);

-- ── leads (consenting marketing data — separate from responses) ───────────────
create table if not exists public.leads (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null,
  role               text,
  company_name       text,
  company_size       text,
  industry           text,
  calculator_payload jsonb,
  created_at         timestamptz not null default now()
);

-- ── calculator_runs (anonymous usage analytics) ───────────────────────────────
create table if not exists public.calculator_runs (
  id         uuid primary key default gen_random_uuid(),
  payload    jsonb not null,
  result     jsonb not null,
  created_at timestamptz not null default now()
);

-- Indexes for the common access paths.
create index if not exists organisations_owner_idx on public.organisations (owner_user_id);
create index if not exists audits_org_idx           on public.audits (org_id);
create index if not exists audits_token_idx         on public.audits (public_token);
create index if not exists responses_audit_idx      on public.responses (audit_id);
