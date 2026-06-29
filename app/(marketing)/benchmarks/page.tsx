import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Disclaimer } from "@/components/Disclaimer";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getBenchmarkTeasers, type BenchmarkTeaser } from "@/lib/benchmark-service";
import { DIMENSION_META, MIN_COMPANIES_PER_BENCHMARK } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Benchmarks",
  description:
    "Anonymised sector and size benchmarks across the 5C model — shown only once enough organisations have contributed to be meaningful.",
};

export const dynamic = "force-dynamic";

export default async function BenchmarksPage() {
  let teasers: BenchmarkTeaser[] = [];
  if (isSupabaseConfigured()) {
    // Anon-scoped read: RLS only returns cells with n_companies >= 8.
    teasers = await getBenchmarkTeasers(createClient());
  }

  return (
    <Container className="py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          The moat
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-brand-900">
          See where you stand against your sector
        </h1>
        <p className="mt-4 text-lg text-brand-600">
          A score is forgettable. &ldquo;Bottom quartile for Capacity among
          sub-50-person SaaS companies&rdquo; is not. Every anonymous response
          makes these benchmarks richer — and we only ever show a cell once at
          least {MIN_COMPANIES_PER_BENCHMARK} organisations stand behind it.
        </p>
      </div>

      {teasers.length > 0 ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teasers.map((t) => (
            <div
              key={`${t.sector}-${t.sizeBand}`}
              className="rounded-xl border border-brand-100 bg-white p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-brand-400">
                {t.sector} · {t.sizeBand}
              </p>
              <p className="mt-2 text-brand-800">
                Weakest dimension:{" "}
                <span className="font-semibold">
                  {DIMENSION_META[t.weakestDimension].label}
                </span>{" "}
                (median {t.median}/100)
              </p>
              <p className="mt-1 text-xs text-brand-400">
                across {t.nCompanies} organisations
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-8 text-center">
          <h2 className="font-serif text-xl font-semibold text-brand-900">
            Benchmarks unlock as the pool grows
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-brand-600">
            No sector yet has the {MIN_COMPANIES_PER_BENCHMARK}+ contributing
            organisations we require before publishing a benchmark. Showing you an
            honest empty state — rather than a number built on three companies —
            is the point. Run an audit to help build your sector&rsquo;s pool.
          </p>
        </div>
      )}

      <div className="mt-12 flex flex-wrap gap-3">
        <ButtonLink href="/calculator">Calculate burnout cost</ButtonLink>
        <ButtonLink href="/audit" variant="secondary">
          Run a Workplace Audit
        </ButtonLink>
      </div>

      <div className="mt-12 max-w-prose border-t border-brand-100 pt-6">
        <Disclaimer />
      </div>
    </Container>
  );
}
