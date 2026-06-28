-- ─────────────────────────────────────────────────────────────────────────────
-- 0002_rls.sql — Row Level Security
--
-- RLS is the second pillar of the trust story (with the min-N rule). Even a bug
-- in app code cannot let one org read another's data, because Postgres refuses
-- at the row level.
--
-- Write paths for anonymous/marketing data (responses, leads, calculator_runs)
-- go through trusted server routes using the SERVICE ROLE key, which bypasses
-- RLS. So those tables get RLS ENABLED WITH NO PUBLIC POLICIES — the anon and
-- authenticated roles can neither read nor write them directly. The server
-- route validates the audit's public_token before inserting a response.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.organisations  enable row level security;
alter table public.audits         enable row level security;
alter table public.responses      enable row level security;
alter table public.leads          enable row level security;
alter table public.calculator_runs enable row level security;

-- ── organisations: an owner has full access to their own org only ─────────────
drop policy if exists "organisations_owner_all" on public.organisations;
create policy "organisations_owner_all" on public.organisations
  for all
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- ── audits: full access to the owner of the parent organisation ───────────────
drop policy if exists "audits_owner_all" on public.audits;
create policy "audits_owner_all" on public.audits
  for all
  to authenticated
  using (
    exists (
      select 1 from public.organisations o
      where o.id = audits.org_id and o.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organisations o
      where o.id = audits.org_id and o.owner_user_id = auth.uid()
    )
  );

-- ── responses: SELECT only by the audit's org owner ───────────────────────────
-- Aggregation + the min-N anonymity guard happen in the scores API on top of
-- this. Inserts are performed server-side via the service role after the public
-- token is validated (no direct anon insert policy by design).
drop policy if exists "responses_owner_select" on public.responses;
create policy "responses_owner_select" on public.responses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.audits a
      join public.organisations o on o.id = a.org_id
      where a.id = responses.audit_id and o.owner_user_id = auth.uid()
    )
  );

-- leads & calculator_runs: intentionally NO policies. With RLS enabled and no
-- policy, anon/authenticated have zero access; only the service role (server
-- routes) can write/read them.
