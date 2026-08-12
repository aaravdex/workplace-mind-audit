import type { ReviewedTheme, ThematicAnalysis, ThemeTone } from "@/lib/thematicAnalysis";
import {
  TA_CITATION,
  TA_METHOD_STATEMENT,
  TA_QUALITY_ATTRIBUTION,
  TA_QUALITY_CHECKLIST,
} from "@/lib/ta-methodology";
import { cn } from "@/lib/utils";

const TONE: Record<ThemeTone, string> = {
  negative: "bg-amber-50 text-amber-800 ring-amber-200",
  mixed: "bg-brand-100 text-brand-500 ring-brand-200",
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

function ThemeCard({ t, reportingThreshold }: { t: ReviewedTheme; reportingThreshold: number }) {
  const segments = t.bySegment.filter((s) => s.count >= reportingThreshold);
  return (
    <div className="rounded-xl border border-brand-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-brand-900">{t.name}</span>
        {t.status === "confirmed" ? (
          <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-200">Confirmed theme</Pill>
        ) : (
          <Pill className="bg-amber-50 text-amber-800 ring-amber-200">Candidate — not yet reviewed</Pill>
        )}
        <span className="text-xs text-brand-400">
          {t.prevalence} mention{t.prevalence === 1 ? "" : "s"}
        </span>
        <Pill className={TONE[t.tone]}>{t.tone}</Pill>
        {t.thin && <Pill className="bg-brand-100 text-brand-500 ring-brand-200">thin — treat with caution</Pill>}
      </div>

      <p className="mt-2 text-sm text-brand-600">{t.definition}</p>

      {t.mergedFrom.length > 0 && (
        <p className="mt-1 text-xs text-brand-400">Merged in: {t.mergedFrom.join(", ")}</p>
      )}

      {t.codes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {t.codes.map((c) => (
            <span
              key={c.id}
              title={c.definition}
              className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600 ring-1 ring-inset ring-brand-100"
            >
              {c.label} · {c.count}
            </span>
          ))}
        </div>
      )}

      {segments.length > 0 && (
        <p className="mt-2 text-xs text-brand-400">
          Where it concentrates: {segments.map((s) => `${s.segment} (${s.count})`).join(", ")}
        </p>
      )}

      {t.illustrativeExtracts.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm italic text-brand-600">
          {t.illustrativeExtracts.map((q) => (
            <li key={q}>&ldquo;{q}&rdquo;</li>
          ))}
        </ul>
      )}

      {t.note && <p className="mt-2 text-xs text-brand-500">Consultant note: {t.note}</p>}
    </div>
  );
}

/**
 * Reflexive thematic analysis of the open-text answers (Method A). Shows the
 * dataset overview (Phase 1), the reviewed/candidate themes (Phases 3–5), and an
 * honest statement of how they were produced. Candidate = machine first-pass,
 * awaiting consultant review; Confirmed = the consultant has reviewed it.
 */
export function ThematicAnalysisSection({
  ta,
  reportingThreshold,
}: {
  ta: ThematicAnalysis;
  reportingThreshold: number;
}) {
  const f = ta.familiarisation;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm text-brand-600">
        <span className="font-medium text-brand-900">{f.totalComments}</span> comment
        {f.totalComments === 1 ? "" : "s"} · avg {f.meanWordCount} words
        {f.uncodedCount > 0 && (
          <>
            {" "}·{" "}
            <span className="text-amber-700">
              {f.uncodedCount} did not match the codebook — read these manually
            </span>
          </>
        )}
      </div>

      {ta.reviewedThemes.map((t) => (
        <ThemeCard key={t.id} t={t} reportingThreshold={reportingThreshold} />
      ))}

      <details className="rounded-xl border border-brand-100 p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-accent-700">
          How these themes were produced
        </summary>
        <p className="mt-2 text-sm text-brand-600">{TA_METHOD_STATEMENT}</p>
        <ul className="mt-3 space-y-1 text-sm text-brand-600">
          {TA_QUALITY_CHECKLIST.map((q) => (
            <li key={q} className="flex gap-2">
              <span aria-hidden className="text-accent-500">
                ·
              </span>
              <span>{q}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs italic text-brand-400">
          {TA_QUALITY_ATTRIBUTION} {TA_CITATION}
        </p>
      </details>
    </div>
  );
}
