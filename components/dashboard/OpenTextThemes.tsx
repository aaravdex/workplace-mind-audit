import type { OpenTextTheme } from "@/lib/openText";
import { cn } from "@/lib/utils";

const SENTIMENT: Record<OpenTextTheme["sentiment"], string> = {
  negative: "bg-amber-50 text-amber-800 ring-amber-200",
  mixed: "bg-brand-100 text-brand-500 ring-brand-200",
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

/** Redacted, clustered open-text themes with counts and sentiment. Verbatims
 *  appear only when the audit permits them and the sample is large enough. */
export function OpenTextThemes({ themes }: { themes: OpenTextTheme[] }) {
  return (
    <div className="space-y-3">
      {themes.map((t) => (
        <div key={t.theme} className="rounded-xl border border-brand-100 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-brand-900">{t.theme}</span>
            <span className="text-xs text-brand-400">
              {t.count} mention{t.count === 1 ? "" : "s"}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                SENTIMENT[t.sentiment],
              )}
            >
              {t.sentiment}
            </span>
          </div>
          {t.sampleQuotes.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm italic text-brand-600">
              {t.sampleQuotes.map((q) => (
                <li key={q}>“{q}”</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
