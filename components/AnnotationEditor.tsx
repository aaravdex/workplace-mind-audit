"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIMENSIONS, DIMENSION_META } from "@/lib/constants";
import type { AuditAnnotation } from "@/lib/annotations";
import type { Dimension } from "@/types";

export function AnnotationEditor({
  auditId,
  initial,
}: {
  auditId: string;
  initial: AuditAnnotation;
}) {
  const router = useRouter();
  const [executiveSummaryNote, setExec] = useState(
    initial.executiveSummaryNote,
  );
  const [dimensionNotes, setDimensionNotes] = useState<Record<string, string>>(
    initial.dimensionNotes,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  function setNote(d: Dimension, value: string) {
    setDimensionNotes((prev) => ({ ...prev, [d]: value }));
  }

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch(`/api/annotations/${auditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executiveSummaryNote, dimensionNotes }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  const ta =
    "mt-2 w-full rounded-md border border-brand-200 p-3 text-sm text-brand-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-brand-800">
          Executive summary note
        </label>
        <p className="text-xs text-brand-400">
          2–3 sentences of bespoke interpretation. This leads the report.
        </p>
        <textarea
          rows={4}
          value={executiveSummaryNote}
          onChange={(e) => setExec(e.target.value)}
          className={ta}
          placeholder="e.g. The Connection gap in Operations tracks the two senior departures last quarter…"
        />
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-brand-800">
          Per-dimension notes (optional)
        </p>
        {DIMENSIONS.map((d) => (
          <div key={d}>
            <label className="text-xs font-medium text-brand-600">
              {DIMENSION_META[d].label}
            </label>
            <textarea
              rows={2}
              value={dimensionNotes[d] ?? ""}
              onChange={(e) => setNote(d, e.target.value)}
              className={ta}
              placeholder={`A short, specific read on ${DIMENSION_META[d].label}…`}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={status === "saving"}
          className="h-10 rounded-md bg-accent-500 px-5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save interpretation"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-emerald-700">Saved.</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-600">
            Could not save — are you signed in as a consultant?
          </span>
        )}
      </div>
    </div>
  );
}
