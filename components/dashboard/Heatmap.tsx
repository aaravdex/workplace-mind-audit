import { BAND_META, DIMENSIONS, DIMENSION_META } from "@/lib/constants";
import { riskBand } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { DimensionScores } from "@/types";

/** Coloured 5C grid — instant visual triage by band. */
export function Heatmap({ dimensions }: { dimensions: DimensionScores }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {DIMENSIONS.map((d) => {
        const score = dimensions[d];
        const band = score === null ? null : riskBand(score);
        const meta = band ? BAND_META[band] : null;
        return (
          <div
            key={d}
            className={cn(
              "rounded-xl p-4 ring-1 ring-inset",
              meta ? `${meta.bg} ${meta.ring}` : "bg-brand-50 ring-brand-100",
            )}
          >
            <div className="text-xs font-medium text-brand-600">
              {DIMENSION_META[d].label}
            </div>
            <div className="mt-1 text-3xl font-semibold text-brand-900">
              {score ?? "—"}
            </div>
            <div
              className={cn(
                "mt-1 text-xs font-semibold",
                meta?.text ?? "text-brand-400",
              )}
            >
              {band ?? "No data"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
