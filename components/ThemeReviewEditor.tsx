"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CandidateTheme,
  ThemeDecision,
  ThemeReview,
  ThemeReviewEntry,
} from "@/lib/thematicAnalysis";
import { THEME_DECISION_LABEL } from "@/lib/thematicAnalysis";

type Status = "idle" | "saving" | "saved" | "error";
const DECISIONS: ThemeDecision[] = ["unreviewed", "keep", "merge", "discard"];

/**
 * Consultant reflexive-review editor (reflexive TA Phases 4–5). Lists the
 * machine's candidate themes and lets a consultant keep / merge / discard each
 * and give it a final name + definition. Each card saves independently to the
 * consultant-only theme-review route; the client can see the result but only a
 * consultant can write it.
 */
export function ThemeReviewEditor({
  auditId,
  candidateThemes,
  initial,
}: {
  auditId: string;
  candidateThemes: CandidateTheme[];
  initial: ThemeReview;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<string, ThemeReviewEntry>>(() => {
    const seed: Record<string, ThemeReviewEntry> = {};
    for (const t of candidateThemes) {
      seed[t.id] = initial[t.id] ?? { decision: "unreviewed" };
    }
    return seed;
  });
  const [statusById, setStatusById] = useState<Record<string, Status>>({});

  function patch(id: string, delta: Partial<ThemeReviewEntry>) {
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...delta } }));
    setStatusById((prev) => ({ ...prev, [id]: "idle" }));
  }

  async function save(id: string) {
    const entry = entries[id];
    if (entry.decision === "merge" && !entry.mergedInto) {
      setStatusById((prev) => ({ ...prev, [id]: "error" }));
      return;
    }
    setStatusById((prev) => ({ ...prev, [id]: "saving" }));
    try {
      const res = await fetch(`/api/audits/${auditId}/theme-review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId: id,
          decision: entry.decision,
          name: entry.name?.trim() || undefined,
          definition: entry.definition?.trim() || undefined,
          note: entry.note?.trim() || undefined,
          mergedInto: entry.decision === "merge" ? entry.mergedInto : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setStatusById((prev) => ({ ...prev, [id]: "saved" }));
      router.refresh();
    } catch {
      setStatusById((prev) => ({ ...prev, [id]: "error" }));
    }
  }

  const input =
    "mt-1 w-full rounded-md border border-brand-200 p-2 text-sm text-brand-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

  if (candidateThemes.length === 0) {
    return (
      <p className="text-sm text-brand-400">
        No open-text answers to review yet. Themes appear here once responses with free-text arrive.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {candidateThemes.map((t) => {
        const entry = entries[t.id];
        const status = statusById[t.id] ?? "idle";
        const others = candidateThemes.filter((o) => o.id !== t.id);
        return (
          <div key={t.id} className="rounded-xl border border-brand-100 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-brand-900">{t.provisionalName}</span>
              <span className="text-xs text-brand-400">
                {t.prevalence} mention{t.prevalence === 1 ? "" : "s"}
              </span>
              {t.thin && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                  thin
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-brand-400">{t.centralOrganisingConcept}</p>
            {t.codes.length > 0 && (
              <p className="mt-1 text-xs text-brand-400">
                Codes: {t.codes.map((c) => `${c.label} (${c.count})`).join(", ")}
              </p>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-brand-600">Decision</label>
                <select
                  value={entry.decision}
                  onChange={(e) => patch(t.id, { decision: e.target.value as ThemeDecision })}
                  className={input}
                >
                  {DECISIONS.map((d) => (
                    <option key={d} value={d}>
                      {THEME_DECISION_LABEL[d]}
                    </option>
                  ))}
                </select>
              </div>

              {entry.decision === "merge" && (
                <div>
                  <label className="text-xs font-medium text-brand-600">Merge into</label>
                  <select
                    value={entry.mergedInto ?? ""}
                    onChange={(e) => patch(t.id, { mergedInto: e.target.value || undefined })}
                    className={input}
                  >
                    <option value="">Choose a theme…</option>
                    {others.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.provisionalName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {entry.decision === "keep" && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-brand-600">Theme name (Phase 5)</label>
                  <input
                    type="text"
                    value={entry.name ?? ""}
                    onChange={(e) => patch(t.id, { name: e.target.value })}
                    className={input}
                    placeholder={t.provisionalName}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-brand-600">Definition (Phase 5)</label>
                  <textarea
                    rows={2}
                    value={entry.definition ?? ""}
                    onChange={(e) => patch(t.id, { definition: e.target.value })}
                    className={input}
                    placeholder={t.centralOrganisingConcept}
                  />
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="text-xs font-medium text-brand-600">Reviewing note (optional)</label>
              <input
                type="text"
                value={entry.note ?? ""}
                onChange={(e) => patch(t.id, { note: e.target.value })}
                className={input}
                placeholder="e.g. Corroborated in the Ops focus group."
              />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => save(t.id)}
                disabled={status === "saving"}
                className="h-9 rounded-md bg-accent-500 px-4 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
              >
                {status === "saving" ? "Saving…" : "Save"}
              </button>
              {status === "saved" && <span className="text-sm text-emerald-700">Saved.</span>}
              {status === "error" && (
                <span className="text-sm text-red-600">
                  {entry.decision === "merge" && !entry.mergedInto
                    ? "Choose a theme to merge into."
                    : "Could not save — are you signed in as a consultant?"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
