import type { InterventionPlan } from "@/lib/interventions/plan";
import { cn } from "@/lib/utils";

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
        {title}
      </h5>
      <ul className="mt-1 space-y-0.5 text-brand-600">
        {items.map((it) => (
          <li key={it}>– {it}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The intervention plan: a phased 30-60-90 roadmap, the selected interventions
 * (primary-first, with why + dependency), and full expandable playbooks for the
 * primary responses. Native <details> — no client JS.
 */
export function InterventionPlanSection({ plan }: { plan: InterventionPlan }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
          30-60-90 roadmap
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {plan.roadmap.map((w) => (
            <div key={w.window} className="rounded-xl border border-brand-100 p-4">
              <h4 className="font-medium text-brand-900">{w.window}</h4>
              <ul className="mt-2 space-y-1 text-sm text-brand-600">
                {w.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span aria-hidden className="text-accent-500">
                      ·
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {plan.items.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
            Selected interventions
          </h3>
          <div className="mt-3 space-y-4">
            {plan.items.map((it) => {
              const pb = plan.playbooks.find(
                (p) => p.interventionId === it.intervention.interventionId,
              );
              return (
                <div
                  key={it.intervention.interventionId}
                  className="rounded-xl border border-brand-100 p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-brand-900">
                      {it.intervention.title}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                        it.isPrimaryResponse
                          ? "bg-accent-50 text-accent-700 ring-accent-200"
                          : "bg-brand-50 text-brand-500 ring-brand-200",
                      )}
                    >
                      {it.isPrimaryResponse ? "Primary response" : it.intervention.interventionLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-brand-600">{it.whyChosen}</p>
                  {it.dependencyExplanation && (
                    <p className="mt-1 text-xs italic text-brand-400">
                      {it.dependencyExplanation}
                    </p>
                  )}
                  {pb && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-accent-700">
                        Full playbook
                      </summary>
                      <div className="mt-2 space-y-3 text-sm">
                        <p className="text-brand-700">
                          <span className="font-medium">Problem addressed:</span>{" "}
                          {pb.problemAddressed}
                        </p>
                        <List title="Intended outcomes" items={pb.intendedOutcomes} />
                        <p className="text-xs text-brand-500">
                          <span className="font-medium">Ownership —</span> Accountable:{" "}
                          {pb.ownership.accountable}; Responsible: {pb.ownership.responsible}
                        </p>
                        <div>
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                            Steps
                          </h5>
                          <ol className="mt-1 space-y-2">
                            {pb.steps.map((s) => (
                              <li key={s.stepNumber} className="rounded-lg bg-brand-50 p-3">
                                <p className="font-medium text-brand-800">
                                  {s.stepNumber}. {s.title}{" "}
                                  <span className="font-normal text-brand-400">
                                    · {s.owner} · {s.deadline}
                                  </span>
                                </p>
                                <ul className="mt-1 space-y-0.5 text-brand-600">
                                  {s.actions.map((a) => (
                                    <li key={a}>– {a}</li>
                                  ))}
                                </ul>
                                <p className="mt-1 text-xs text-brand-500">
                                  Success: {s.successMeasure}
                                </p>
                              </li>
                            ))}
                          </ol>
                        </div>
                        <List title="Leading indicators" items={pb.leadingIndicators} />
                        <List title="Lagging indicators" items={pb.laggingIndicators} />
                        <List title="Review decision menu" items={pb.reviewDecisionMenu} />
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {plan.notes.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
          {plan.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}
