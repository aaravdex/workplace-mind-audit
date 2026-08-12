-- ─────────────────────────────────────────────────────────────────────────────
-- 0009_theme_review.sql — Consultant reflexive-TA review (Method A, Phases 4–5)
--
-- The thematic-analysis engine produces CANDIDATE themes deterministically. The
-- consultant's review of those candidates — keep / merge / discard, plus a final
-- name and definition — is stored ON audit_annotations as a new jsonb column, so
-- it inherits the existing 0003 RLS exactly like validation_statuses (0007):
--
--   CONSULTANT-write, owner-OR-consultant-read.
--   → The client SEES the reviewed themes; only a consultant SETS the review.
--   (No new policy needed — same mechanism as the annotation/validation layer.)
--
-- Shape (keyed by candidate theme id, e.g. "ct-workload"):
--   { "ct-workload": { "decision": "keep", "name": "...", "definition": "...",
--                       "note": "...", "mergedInto": "ct-…" }, ... }
--
-- Additive and safe on the live DB. Nothing here touches the anonymous responses.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.audit_annotations
  add column if not exists theme_review jsonb not null default '{}'::jsonb;
