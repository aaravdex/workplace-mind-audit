import type { ConfidenceLevel } from "@/lib/dataQuality";
import type { Finding } from "@/lib/interpretation";
import type { PatternFinding } from "@/lib/patterns";
import { cn } from "@/lib/utils";

const CONFIDENCE: Record<ConfidenceLevel, { label: string; cls: string }> = {
  high: { label: "High confidence", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  moderate: { label: "Moderate confidence", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  exploratory: { label: "Exploratory", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  insufficient: { label: "Insufficient", cls: "bg-brand-100 text-brand-500 ring-brand-200" },
};

function Chip({ level }: { level: ConfidenceLevel }) {
  const c = CONFIDENCE[level];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        c.cls,
      )}
    >
      {c.label}
    </span>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
        {title}
      </h4>
      <ul className="mt-1 space-y-1 text-sm text-brand-600">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden className="text-accent-500">
              ·
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FindingCard({ f }: { f: Finding }) {
  const insufficient = f.confidence === "insufficient" || f.riskLevel === null;
  return (
    <div className="rounded-xl border border-brand-100 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-brand-900">{f.title}</h3>
        <Chip level={f.confidence} />
      </div>
      <p className="mt-2 text-sm text-brand-700">{f.observation}</p>
      {!insufficient && (
        <>
          <p className="mt-2 text-sm font-medium text-brand-900">{f.interpretation}</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-accent-700">
              Evidence, causes to validate &amp; implications
            </summary>
            <div className="mt-1">
              {f.evidence.itemDrivers.length > 0 && (
                <List
                  title="What's driving it"
                  items={f.evidence.itemDrivers.map((d) =>
                    d.direction === "unfavourable"
                      ? `${d.unfavourablePct}% did not endorse “${d.text}”`
                      : `${d.favourablePct}% endorsed “${d.text}”`,
                  )}
                />
              )}
              {f.evidence.groupDifferences.length > 0 && (
                <List
                  title="Where it concentrates"
                  items={f.evidence.groupDifferences.map(
                    (g) => `${g.segment}: ${g.score} (${g.delta} vs the dimension mean)`,
                  )}
                />
              )}
              <List title="Possible causes to validate" items={f.rootCauseHypotheses} />
              <List title="Alternative explanations" items={f.alternativeExplanations} />
              <List title="Validate through" items={f.validationQuestions} />
              <List title="Business implications" items={f.businessImplications} />
              <List title="Employee implications" items={f.employeeImplications} />
              <p className="mt-3 text-xs italic text-brand-400">
                {f.limitations.join(" ")}
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function PatternCard({ p }: { p: PatternFinding }) {
  return (
    <div className="rounded-xl border border-accent-200 bg-accent-50 p-5">
      <h3 className="font-medium text-brand-900">{p.title}</h3>
      <p className="mt-2 text-sm text-brand-700">{p.observation}</p>
      <p className="mt-2 text-sm font-medium text-brand-900">{p.interpretation}</p>
      <div className="mt-3 rounded-lg border border-accent-200 bg-white p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">
          Preferred response
        </span>
        <p className="mt-1 text-sm text-accent-900">{p.preferredInterventionClass}</p>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-accent-700">
          Causes to validate
        </summary>
        <div className="mt-1">
          <List title="Possible causes to validate" items={p.rootCauseHypotheses} />
          <List title="Alternative explanations" items={p.alternativeExplanations} />
          <List title="Validate through" items={p.validationQuestions} />
          {p.proxyNote && (
            <p className="mt-3 text-xs italic text-brand-400">{p.proxyNote}</p>
          )}
          <p className="mt-2 text-xs italic text-brand-400">{p.limitations.join(" ")}</p>
        </div>
      </details>
    </div>
  );
}

/**
 * The interpretation layer, surfaced. Combined-risk patterns first (the bigger
 * story), then per-dimension findings — each separating observation from
 * interpretation from hypothesis, with a confidence chip.
 */
export function FindingsSection({
  findings,
  patterns,
}: {
  findings: Finding[];
  patterns: PatternFinding[];
}) {
  return (
    <div className="space-y-6">
      {patterns.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
            Combined-risk patterns
          </h3>
          <p className="mt-1 text-sm text-brand-500">
            Where single scores combine into a bigger story.
          </p>
          <div className="mt-4 space-y-4">
            {patterns.map((p) => (
              <PatternCard key={p.patternId} p={p} />
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-500">
          Dimension findings
        </h3>
        <div className="mt-4 space-y-4">
          {findings.map((f) => (
            <FindingCard key={f.findingId} f={f} />
          ))}
        </div>
      </div>
    </div>
  );
}
