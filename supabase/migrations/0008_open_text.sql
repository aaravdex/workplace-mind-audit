-- ─────────────────────────────────────────────────────────────────────────────
-- 0008_open_text.sql — Optional open-text analysis (Phase 7)
--
--  • responses.open_text jsonb — the redacted free-text answers for a response.
--    Redaction (strip emails/phones/URLs/@handles) is applied SERVER-SIDE before
--    insert, so raw identifiers are never stored. Still on the anonymous
--    responses table (no user_id, no PII) — it is simply the answer content.
--  • audits.collect_open_text — off by default, so NO existing or new survey
--    changes unless the owner explicitly opts in. The employee survey is never
--    silently lengthened.
--  • audits.open_text_verbatims — off by default: themes render as counts +
--    paraphrase; verbatim quotes appear only when the owner enables them AND the
--    sample is large enough (enforced in code).
--
-- Additive and safe on the live DB; nothing here alters existing behaviour.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.responses
  add column if not exists open_text jsonb;

alter table public.audits
  add column if not exists collect_open_text   boolean not null default false,
  add column if not exists open_text_verbatims boolean not null default false;
