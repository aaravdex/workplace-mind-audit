-- ─────────────────────────────────────────────────────────────────────────────
-- 0006_audit_data_quality.sql — Data-quality inputs (Phase 2B)
--
-- Adds two additive columns to `audits`:
--   • invited_count       int  — optional number of people invited, so a
--                                 response rate can be computed (otherwise the
--                                 report says "denominator not provided").
--                                 Admin-provided, org-level — never on responses.
--   • reporting_threshold int  — per-audit minimum responses for SEGMENT-level
--                                 reporting. New audits are set to 10 by the app;
--                                 EXISTING audits are backfilled to 5 below so no
--                                 previously-visible segment disappears. The
--                                 platform floor (5) is still enforced in code
--                                 (max(5, reporting_threshold)); the UI/API never
--                                 let it drop below the floor.
--
-- Backward compatibility: existing audits keep threshold 5 (current behaviour).
-- Neither column touches `responses`; both inherit the owner-only audits RLS
-- (0002_rls.sql), so no new policy is needed. No column default is set on
-- reporting_threshold ON PURPOSE — a default of 10 would backfill existing rows
-- to 10 and hide their 5–9 segments. Existing rows are set to 5 explicitly.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.audits
  add column if not exists invited_count       int,
  add column if not exists reporting_threshold int;

-- Existing audits keep the threshold they were created under (the platform floor).
update public.audits set reporting_threshold = 5 where reporting_threshold is null;
