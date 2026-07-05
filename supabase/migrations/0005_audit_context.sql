-- ─────────────────────────────────────────────────────────────────────────────
-- 0005_audit_context.sql — Organisational Context + survey depth (Phase 1B)
--
-- Adds two additive, nullable/defaulted columns to `audits`:
--   • context      jsonb  — the client admin's organisational context object
--                           (org-level business context, NEVER employee PII).
--   • survey_depth text   — 'core' (existing 25 questions) or 'extended'. The
--                           Extended bank is authored in a later cycle; this
--                           column defaults to 'core' so every existing and new
--                           audit keeps the current 7-minute survey until then.
--
-- Backward compatibility: existing audits get context = NULL ("not collected")
-- and survey_depth = 'core' (unchanged behaviour). No data is rewritten.
--
-- Privacy: owner-only access is ALREADY enforced by the audits RLS policy
-- (0002_rls.sql) — both columns inherit it, so no new policy is needed. Neither
-- column is ever selected in the public/anonymous survey path.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.audits
  add column if not exists context      jsonb,
  add column if not exists survey_depth  text not null default 'core';
