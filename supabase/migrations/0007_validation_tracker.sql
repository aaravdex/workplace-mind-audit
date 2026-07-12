-- ─────────────────────────────────────────────────────────────────────────────
-- 0007_validation_tracker.sql — Validation statuses + implementation tracker
--                                (Phase 6)
--
-- TWO stores, two access models:
--
--  1. Validation statuses live ON audit_annotations (a new jsonb column), so they
--     inherit the existing 0003 RLS: CONSULTANT-write, owner-OR-consultant-read.
--     → The client SEES the validation status; only a consultant SETS it.
--     (No new policy needed — same mechanism as the annotation layer.)
--
--  2. The implementation tracker is a NEW client-facing table. The audit's org
--     owner OR a consultant can do everything with it; a different org sees
--     NOTHING — including evidence records. Cross-org isolation is enforced at
--     the row level, exactly like every other org-owned table.
--
-- Additive and safe on the live DB. Nothing touches the anonymous responses.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Consultant-set validation statuses, keyed by finding/pattern refId.
alter table public.audit_annotations
  add column if not exists validation_statuses jsonb not null default '{}'::jsonb;

-- 2) Client-facing implementation tracker (fidelity stored as jsonb).
create table if not exists public.audit_actions (
  id              uuid primary key default gen_random_uuid(),
  audit_id        uuid not null references public.audits (id) on delete cascade,
  title           text not null,
  owner           text,
  deadline        text,
  status          text not null default 'not-started',
  evidence        text,
  kpi             text,
  review_date     text,
  fidelity        jsonb,
  intervention_id text,
  created_at      timestamptz not null default now()
);
create index if not exists audit_actions_audit_idx on public.audit_actions (audit_id);

alter table public.audit_actions enable row level security;

-- Owner of the audit's org OR a consultant may do everything with the audit's
-- actions; any other org is refused at the row level (evidence included).
drop policy if exists "audit_actions_access" on public.audit_actions;
create policy "audit_actions_access" on public.audit_actions
  for all
  to authenticated
  using (
    public.is_consultant()
    or exists (
      select 1 from public.audits a
      join public.organisations o on o.id = a.org_id
      where a.id = audit_actions.audit_id and o.owner_user_id = auth.uid()
    )
  )
  with check (
    public.is_consultant()
    or exists (
      select 1 from public.audits a
      join public.organisations o on o.id = a.org_id
      where a.id = audit_actions.audit_id and o.owner_user_id = auth.uid()
    )
  );
