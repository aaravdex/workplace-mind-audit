-- ─────────────────────────────────────────────────────────────────────────────
-- 0004_audit_cost_inputs.sql
--
-- Lets an org owner save the real business figures for an audit (headcount,
-- salary, turnover, etc.) so the consulting report's cost loop uses THEIR
-- numbers rather than a sector-average default. When this is null, the report
-- must clearly label its figure as sector-average — never present a default as
-- bespoke. Owner-only access is already enforced by the audits RLS policy.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.audits
  add column if not exists cost_inputs jsonb;
