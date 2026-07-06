import type { Prioritisation, PriorityClass } from "@/lib/priority";
import { priorityClassLabel } from "@/lib/priority";
import { cn } from "@/lib/utils";

const CLASS_CLS: Record<PriorityClass, string> = {
  "immediate-safeguarding": "bg-red-50 text-red-700 ring-red-200",
  "immediate-operational": "bg-amber-50 text-amber-800 ring-amber-200",
  strategic: "bg-sky-50 text-sky-700 ring-sky-200",
  developmental: "bg-brand-50 text-brand-600 ring-brand-200",
  monitor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "insufficient-evidence": "bg-brand-100 text-brand-500 ring-brand-200",
};

/**
 * Ranked risks with their classification and a plain rationale. Safeguarding
 * items are never rendered here — they are held for consultant review; only a
 * neutral count is shown.
 */
export function PrioritisedRisks({
  prioritisation,
}: {
  prioritisation: Prioritisation;
}) {
  const visible = prioritisation.items.filter((i) => i.clientVisible);
  const held = prioritisation.safeguardingCount;
  return (
    <div>
      <ol className="space-y-3">
        {visible.map((item, idx) => (
          <li key={item.refId} className="rounded-xl border border-brand-100 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-brand-400">
                {idx + 1}
              </span>
              <span className="font-medium text-brand-900">{item.title}</span>
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                  CLASS_CLS[item.classification],
                )}
              >
                {priorityClassLabel(item.classification)}
              </span>
            </div>
            <p className="mt-1 text-sm text-brand-600">{item.rationale}</p>
          </li>
        ))}
      </ol>
      {held > 0 && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 ring-1 ring-inset ring-red-200">
          {held} protected concern{held === 1 ? "" : "s"} detected — held for
          consultant review and not shown here. Safeguarding patterns are never
          auto-reported.
        </p>
      )}
      {prioritisation.summary && (
        <p className="mt-4 text-xs italic text-brand-500">
          {prioritisation.summary}
        </p>
      )}
    </div>
  );
}
