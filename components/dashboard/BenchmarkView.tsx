import type { BenchmarkResult, BenchmarkBand } from "@/lib/benchmark";
import { DIMENSIONS, DIMENSION_META, MIN_COMPANIES_PER_BENCHMARK } from "@/lib/constants";
import type { Dimension, DimensionScores } from "@/types";

const BAND_STYLE: Record<BenchmarkBand, { label: string; bar: string; text: string }> = {
  "bottom quartile": { label: "Bottom quartile", bar: "bg-red-500", text: "text-red-700" },
  "below median": { label: "Below median", bar: "bg-amber-500", text: "text-amber-800" },
  "above median": { label: "Above median", bar: "bg-sky-500", text: "text-sky-700" },
  "top quartile": { label: "Top quartile", bar: "bg-emerald-500", text: "text-emerald-700" },
};

export function BenchmarkView({
  benchmarks,
  dimensions,
  sector,
  sizeBand,
}: {
  benchmarks: Record<Dimension, BenchmarkResult | null>;
  dimensions: DimensionScores;
  sector: string | null;
  sizeBand: string | null;
}) {
  const anyData = DIMENSIONS.some((d) => benchmarks[d] !== null);

  if (!sector || !sizeBand) {
    return (
      <p className="rounded-lg bg-brand-50 p-4 text-sm text-brand-500">
        Add your sector and company size to benchmark against comparable
        organisations.
      </p>
    );
  }

  if (!anyData) {
    return (
      <div className="rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-600">
        <div className="flex items-center gap-2 font-medium text-brand-800">
          <span aria-hidden>🔒</span> Sector benchmark unlocks as the pool grows
        </div>
        <p className="mt-2">
          We show your standing against peers only once at least{" "}
          {MIN_COMPANIES_PER_BENCHMARK} organisations of your sector and size have
          contributed — both to protect those companies and because a benchmark
          built on a handful of firms would be meaningless. Your absolute 5C
          scores and cost analysis are shown above and are unaffected.
        </p>
        <p className="mt-2 text-brand-400">
          Your participation is helping build the {sector} · {sizeBand} pool; this
          view fills in automatically once the threshold is reached.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-brand-500">
        How you compare with {sector} organisations of {sizeBand} people.
      </p>
      <div className="mt-4 space-y-4">
        {DIMENSIONS.map((d) => {
          const score = dimensions[d];
          const b = benchmarks[d];
          return (
            <div key={d}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-brand-800">
                  {DIMENSION_META[d].label}
                </span>
                {b ? (
                  <span className={`text-xs font-semibold ${BAND_STYLE[b.band].text}`}>
                    {BAND_STYLE[b.band].label} · {b.percentile}th pctile
                  </span>
                ) : (
                  <span className="text-xs text-brand-400">
                    insufficient peer data
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-brand-100">
                {score !== null && (
                  <div
                    className={`h-full rounded-full ${b ? BAND_STYLE[b.band].bar : "bg-brand-300"}`}
                    style={{ width: `${score}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-brand-400">
        Percentiles are computed across distinct organisations, never individual
        responses.
      </p>
    </div>
  );
}
