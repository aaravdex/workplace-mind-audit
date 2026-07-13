"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Owner toggle for optional open-text feedback. Off by default — the employee
 * survey only shows open-text questions once this is enabled. Verbatims stay off
 * unless separately enabled, and even then only appear with a large enough sample.
 */
export function OpenTextSettings({
  auditId,
  collectOpenText,
  openTextVerbatims,
}: {
  auditId: string;
  collectOpenText: boolean;
  openTextVerbatims: boolean;
}) {
  const router = useRouter();
  const [collect, setCollect] = useState(collectOpenText);
  const [verbatims, setVerbatims] = useState(openTextVerbatims);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(next: { collect?: boolean; verbatims?: boolean }) {
    const c = next.collect ?? collect;
    const v = next.verbatims ?? verbatims;
    setCollect(c);
    setVerbatims(v);
    setStatus("saving");
    try {
      const res = await fetch(`/api/audits/${auditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectOpenText: c, openTextVerbatims: v }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-brand-700">
        <input
          type="checkbox"
          checked={collect}
          onChange={(e) => save({ collect: e.target.checked })}
          className="h-4 w-4 rounded border-brand-300 text-accent-500 focus:ring-accent-200"
        />
        Collect optional open-text feedback in the survey
      </label>
      <label className="flex items-center gap-2 text-sm text-brand-700">
        <input
          type="checkbox"
          checked={verbatims}
          disabled={!collect}
          onChange={(e) => save({ verbatims: e.target.checked })}
          className="h-4 w-4 rounded border-brand-300 text-accent-500 focus:ring-accent-200 disabled:opacity-50"
        />
        Allow (redacted) verbatim quotes in the report
      </label>
      <p className="text-xs text-brand-400">
        Free-text answers are redacted (emails, phones, URLs stripped) before they
        are stored. Verbatims appear only with enough responses; otherwise themes
        show as counts and paraphrase.
      </p>
      {status === "saved" && <span className="text-xs text-emerald-700">Saved.</span>}
      {status === "error" && <span className="text-xs text-red-600">Could not save.</span>}
    </div>
  );
}
