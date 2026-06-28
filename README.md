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

## Ethical & legal guardrails (baked into code, not just copy)

- **Never diagnoses individuals.** Assesses aggregated organisational patterns only.
- **Aggregate-only reporting.** Individual responses are never shown to employers.
- **Min-N anonymity guardrail.** No segment (e.g. a department) is reported unless
  at least `MIN_RESPONSES_PER_SEGMENT = 5` people responded. Enforced in the
  scoring layer and the scores API — not just the UI — so it cannot be bypassed.
- **Privacy by design.** The `responses` table stores no name, email, or IP — only
  the answer payload, an optional segment tag, and a timestamp.
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
| `npm test`          | Run the Vitest suite once                      |
| `npm run test:watch`| Vitest in watch mode                           |

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
| `RESEND_API_KEY`                  | 2     | Transactional email (empty → console stub)|
| `EMAIL_FROM`                      | 2     | From address for emails                   |
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

## Build roadmap

- [x] **Phase 0** — Scaffold: Next.js + TS + Tailwind, folder structure, design
      system, `.env.example`, README, green test harness.
- [ ] **Phase 1** — Pure logic: `scoring.ts`, `calculator.ts`, `questions.ts`,
      `constants.ts` + full Vitest suite.
- [ ] **Phase 2** — Burnout Cost Calculator page + `/api/calculator` + `/api/leads` + email.
- [ ] **Phase 3** — Supabase schema + RLS + auth + create-audit flow.
- [ ] **Phase 4** — Anonymous survey flow + `/api/responses`.
- [ ] **Phase 5** — Dashboard (five views) + `/api/scores` with min-N enforcement.
- [ ] **Phase 6** — PDF report route.
- [ ] **Phase 7** — Marketing pages + case studies (MDX).
- [ ] **Phase 8** — Stripe behind `ENABLE_PAYMENTS` (optional).
