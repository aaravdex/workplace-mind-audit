# Workplace Mind Audit

A B2B platform that turns workplace psychology into hard business metrics. It
lets organisations **measure** psychological/organisational risk, **calculate**
the financial cost of burnout, and receive **consulting-grade reports** — all
organised around an original framework, the **5C Workplace Risk Model**:
**Capacity · Clarity · Control · Connection · Confidence.**

Every feature serves one of four jobs:

| Job          | Surface                                            |
| ------------ | -------------------------------------------------- |
| **Attract**  | Free Burnout Cost Calculator → lead capture        |
| **Diagnose** | Anonymous 5C Workplace Risk Audit → scoring engine |
| **Report**   | Dashboard + downloadable PDF                        |
| **Convert**  | Services pages, booking, paid tiers                |

---

## What makes it different — sold as a diagnosis, not software

The survey is a commodity; the interpretation is the product. Three architectural
choices form a moat a generic pulse-survey tool cannot copy:

1. **A compounding benchmark.** Every anonymous response feeds a growing,
   sector-and-size-segmented pool. "Bottom quartile for Capacity among sub-50
   SaaS firms" beats "62/100". Guarded by `MIN_COMPANIES_PER_BENCHMARK = 8`.
2. **A closed audit→cost loop.** Real 5C scores re-derive the financial figure
   (`lib/costModel.ts`) within a documented cap, producing a defensible delta —
   "generic £180k → audit-adjusted £247k, concentrated in Operations".
3. **Evidence-anchored coefficients + a human read.** Every cost assumption is a
   named constant with a cited `source` (`lib/coefficients.ts`); every report has
   slots where a consultant injects bespoke interpretation, so it reads authored.

---

## Ethical & legal guardrails (baked into code, not just copy)

- **Never diagnoses individuals.** Assesses aggregated organisational patterns only.
- **Aggregate-only reporting.** Individual responses are never shown to employers.
- **Two-level min-N anonymity, enforced in the data layer.** No segment is reported
  below `MIN_RESPONSES_PER_SEGMENT = 5`; no sector/size benchmark is shown below
  `MIN_COMPANIES_PER_BENCHMARK = 8`. Enforced in scoring/benchmark + the APIs, not
  just the UI.
- **Privacy by design.** The `responses` table stores no name, email, IP, or user
  id — only the answer payload, an optional segment tag, and a timestamp.
- **No overclaiming.** Cost figures are always "modelled estimates based on published
  research" — association, never proof of causation for a specific company.
- **Skippable questions.** Every answer is nullable; scoring ignores missing values.
- **Verbatim disclaimer** renders on every survey and report (see `lib/constants.ts`).

---

## Tech stack

- **Framework:** Next.js 14 (App Router) + TypeScript (strict)
- **Styling:** Tailwind CSS — restrained navy/slate + one warm accent
- **Database + Auth:** Supabase (Postgres + Row Level Security) _(Phase 3)_
- **Charts:** Recharts _(Phase 5)_
- **PDF:** `@react-pdf/renderer`, streamed server-side _(Phase 6)_
- **Email:** Resend, abstracted behind `lib/email.ts` _(Phase 2)_
- **Payments:** Stripe behind `ENABLE_PAYMENTS` _(Phase 8)_
- **Validation:** Zod at every form and API boundary
- **Tests:** Vitest (pure domain logic is fully unit-tested)

---

## Getting started

Requires **Node ≥ 18.18** (developed on Node 22).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#    Fill in values as you reach each phase. Phase 0–2 run with no Supabase.

# 3. Run the dev server
npm run dev          # http://localhost:3000
```

### Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the dev server                          |
| `npm run build`     | Production build                              |
| `npm start`         | Serve the production build                     |
| `npm run lint`      | ESLint (next/core-web-vitals)                  |
| `npm run typecheck` | `tsc --noEmit` (strict)                        |
| `npm test`          | Run the Vitest suite once (integration tests skip without keys) |
| `npm run test:watch`| Vitest in watch mode                           |
| `npm run setup:check` | Validate `.env.local` + Supabase connection; report which migrations to apply |
| `npm run seed:demo` | Seed the Northwind sample (org + 40 responses + benchmark pool) into your live project |
| `npm run test:integration` | Run the live RLS + lifecycle suite against your Supabase (needs `.env.local`) |

---

## Anonymity & abuse protection

The `responses` table stores **no** `user_id`, name, email, or IP — anonymity is
architectural. Abuse protection therefore lives entirely in the request layer,
never on the data row:

- **Duplicate-submission guard:** on first submit, `/api/responses` sets a signed,
  `httpOnly` cookie scoped to a **hash** of the audit's public token. A second
  submit from the same browser is blocked (409). Nothing identifying is written.
- **Rate limiting:** `/api/responses`, `/api/calculator`, and `/api/leads` apply a
  coarse per-request limit keyed on a **transient, salted IP hash** that is used
  only as a key and immediately discarded (`lib/rate-limit.ts`).
- **Residual limitation (documented, not hidden):** the cookie guard is
  per-browser — clearing cookies, a different browser, or incognito can bypass it.
  The rate-limit store is in-memory and per-instance (resets on deploy, not shared
  across serverless instances). For production scale, back the limiter with
  Redis/Upstash. These are deterrents, not hard guarantees; the anonymity of the
  data is the guarantee.

---

## Environment variables

All keys are documented in [`.env.example`](./.env.example). Only `NEXT_PUBLIC_*`
values reach the browser. Secrets live in `.env.local` (git-ignored).

| Variable                          | Phase | Purpose                                   |
| --------------------------------- | ----- | ----------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`            | 0     | Base URL for building survey/report links |
| `NEXT_PUBLIC_SUPABASE_URL`        | 3     | Supabase project URL                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | 3     | Public anon key (RLS-gated)               |
| `SUPABASE_SERVICE_ROLE_KEY`       | 3     | Server-only; bypasses RLS                 |
| `RESEND_API_KEY`                  | 2     | Transactional email (empty → no email sent; UI never claims it was) |
| `EMAIL_FROM`                      | 2     | From address for emails                   |
| `CONTACT_EMAIL` / `BOOKING_URL`   | —     | Contact page; honest "coming soon" until set |
| `RATE_LIMIT_SALT`                 | —     | Salt for transient IP hashing (rate-limit keys only) |
| `NEXT_PUBLIC_ENABLE_PUBLIC_PRICING` | 7   | Show public service prices                |
| `ENABLE_PAYMENTS`                 | 8     | Toggle the Stripe subsystem               |
| `STRIPE_SECRET_KEY` / `…WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 8 | Stripe |

---

## Project structure

```
app/
  (marketing)/      Public site (home, calculator, audit, services, case-studies, …)
  survey/[auditId]/ Anonymous public survey (no auth)
  dashboard/        Auth-gated org-owner views
  api/              Route handlers (calculator, leads, audits, responses, scores, report)
components/         UI primitives + chrome (Header, Footer, Disclaimer, …)
content/           questions.ts (the 25-item bank) + case studies (MDX)
lib/               Pure domain logic (scoring, calculator), constants, supabase, email
supabase/migrations/  Versioned SQL schema + RLS
tests/             Vitest suites
types/             Shared TypeScript types
```

The **intelligence** of the platform lives in two pure, fully-tested files —
`lib/scoring.ts` and `lib/calculator.ts` — which depend on no database or network.

---

## Build roadmap (V2 — benchmark-moat upgrade)

This repo evolved from an initial build, so several phases already ship working
foundations that the V2 phases extend (noted inline). Each phase ends green
(build + lint + test) and pauses for review.

- [x] **Phase 0** — Scaffold + V2 structure reconciliation: routes for
      `/methodology`, `/benchmarks`, `/dashboard/[auditId]/annotate`; API stubs
      for `/api/benchmark`, `/api/cost/[auditId]`, `/api/annotations/[auditId]`;
      `MIN_COMPANIES_PER_BENCHMARK`, `SECTORS`, `SIZE_BANDS`, V2 disclaimer.
- [ ] **Phase 1** — Pure core: add `coefficients.ts`, `costModel.ts`,
      `benchmark.ts`, `recommendations.ts` + Vitest. _(scoring, calculator,
      questions, constants already present.)_
- [ ] **Phase 2** — Calculator wired to cited coefficients + tooltips +
      `/methodology` page. _(calculator page, `/api/calculator`, `/api/leads`,
      email seam already present.)_
- [ ] **Phase 3** — Supabase: add `sector`/`size_band`, `audit_annotations`,
      `benchmark_snapshots`, the `consultant` role claim. _(orgs/audits/
      responses/leads + RLS + auth + create-audit already present.)_
- [ ] **Phase 4** — Survey + `/api/responses`. _(already present — revisit segments.)_
- [ ] **Phase 5** — Dashboard views 1, 2, 4, 6 + `/api/scores`. _(present — extend.)_
- [ ] **Phase 6** — The loop: `/api/cost/[auditId]` + Financial Impact view.
- [ ] **Phase 7** — Benchmark pipeline + `benchmark_snapshots` + `/api/benchmark`
      + Benchmark view + public `/benchmarks` teaser.
- [ ] **Phase 8** — Consultant annotation flow + `/api/annotations`.
- [ ] **Phase 9** — PDF report incorporating benchmark, the cost loop, and notes.
      _(base PDF already present.)_
- [ ] **Phase 10** — Methodology/benchmarks copy + case-study MDX pipeline.
      _(case studies + most marketing already present.)_
- [ ] **Phase 11** — Stripe behind `ENABLE_PAYMENTS`. _(already present.)_

The app builds clean, lints clean, and passes the full Vitest suite with **no
Supabase, Resend, or Stripe credentials** — those unlock auth/dashboard, real
email, and checkout respectively when configured.

### Enabling payments (Phase 8)

Set `ENABLE_PAYMENTS="true"` and `STRIPE_SECRET_KEY` to turn on Stripe Checkout
for the paid service tiers. Add `STRIPE_WEBHOOK_SECRET` and point Stripe at
`/api/stripe/webhook` to receive `checkout.session.completed`. While disabled,
paid tiers show an "Enquire" link and `/api/checkout` returns `503`.
