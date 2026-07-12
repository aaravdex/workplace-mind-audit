import type { PulseSurvey } from "@/lib/evaluation";
import {
  VALIDATION_STATUS_LABEL,
  type ValidationGuide,
  type ValidationStatus,
  type ValidationStatuses,
} from "@/lib/validation";
import { ValidationControl } from "./ValidationControl";
import { cn } from "@/lib/utils";

const STATUS_CLS: Record<ValidationStatus, string> = {
  "not-assessed": "bg-brand-100 text-brand-500 ring-brand-200",
  supported: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "partly-supported": "bg-sky-50 text-sky-700 ring-sky-200",
  "not-supported": "bg-amber-50 text-amber-800 ring-amber-200",
  conflicting: "bg-red-50 text-red-700 ring-red-200",
  "needs-investigation": "bg-amber-50 text-amber-800 ring-amber-200",
};

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
 * Participatory validation: the findings are PRELIMINARY until confirmed. Shows
 * each finding's validation status (client sees; only the consultant sets it via
 * ValidationControl), the focus-group guides, and the targeted pulse surveys.
 */
export function ValidateMeasureSection({
  guides,
  pulses,
  statuses,
  consultant,
  auditId,
}: {
  guides: ValidationGuide[];
  pulses: PulseSurvey[];
  statuses: ValidationStatuses;
  consultant: boolean;
  auditId: string;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-brand-500">
        These findings are <strong>preliminary</strong> until validated. Confirm
        them through the focus groups below before finalising the plan — the
        status is set by the consultant, and visible to everyone.
      </p>

      {guides.length > 0 && (
        <div className="space-y-4">
          {guides.map((g) => {
            const st: ValidationStatus = statuses[g.refId]?.status ?? "not-assessed";
            return (
              <div key={g.refId} className="rounded-xl border border-brand-100 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-brand-900">{g.title}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                      STATUS_CLS[st],
                    )}
                  >
                    {VALIDATION_STATUS_LABEL[st]}
                  </span>
                  {consultant && (
                    <ValidationControl auditId={auditId} refId={g.refId} current={st} />
                  )}
                </div>
                <p className="mt-1 text-sm italic text-brand-500">{g.hypothesis}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-accent-700">
                    Validation guides
                  </summary>
                  <div className="mt-2 space-y-2 text-sm">
                    <List title="Leadership interview" items={g.leadershipGuide} />
                    <List title="Manager focus group" items={g.managerGuide} />
                    <List title="Employee focus group" items={g.employeeGuide} />
                    <List title="Operational data to request" items={g.operationalDataRequests} />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}

      {pulses.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
            Pulse & reassessment
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {pulses.map((p) => (
              <div key={p.name} className="rounded-xl border border-brand-100 p-4">
                <h4 className="font-medium text-brand-900">{p.name}</h4>
                <p className="text-xs text-brand-400">{p.timing}</p>
                <ul className="mt-2 space-y-1 text-sm text-brand-600">
                  {p.questions.map((q) => (
                    <li key={q}>– {q}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
