import type { PlanWindow } from "@/lib/report-content";

/**
 * Renders a phased intervention plan (e.g. the 90-day Stabilise → Rebuild →
 * Embed arc) as a vertical timeline of phase cards.
 */
export function InterventionPlan({ windows }: { windows: PlanWindow[] }) {
  return (
    <ol className="space-y-4">
      {windows.map((w, i) => (
        <li key={w.window} className="relative rounded-xl border border-brand-100 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-900 text-xs font-semibold text-white">
              {i + 1}
            </span>
            <h3 className="font-medium text-brand-900">{w.window}</h3>
          </div>
          <ul className="mt-3 space-y-1.5 pl-10">
            {w.items.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-brand-600">
                <span aria-hidden className="text-accent-500">
                  →
                </span>
                {item}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
