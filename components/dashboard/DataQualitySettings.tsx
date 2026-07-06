"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Owner control for the two data-quality inputs on an audit: the number invited
 * (so a response rate can be shown) and the segment reporting threshold. Saved
 * via the owner-only PATCH /api/audits/[auditId]; the threshold can never go
 * below the platform floor (enforced by the API and the scoring layer).
 */
export function DataQualitySettings({
  auditId,
  invitedCount,
  reportingThreshold,
}: {
  auditId: string;
  invitedCount: number | null;
  reportingThreshold: number;
}) {
  const router = useRouter();
  const [invited, setInvited] = useState(invitedCount?.toString() ?? "");
  const [threshold, setThreshold] = useState(reportingThreshold);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch(`/api/audits/${auditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedCount: invited.trim() === "" ? null : Number(invited),
          reportingThreshold: threshold,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  const inputCls =
    "mt-1 block h-9 rounded-md border border-brand-200 px-3 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

  return (
    <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-brand-100 pt-4">
      <label className="text-xs font-medium text-brand-600">
        Number invited
        <input
          type="number"
          min={0}
          value={invited}
          onChange={(e) => setInvited(e.target.value)}
          placeholder="e.g. 40"
          className={`${inputCls} w-28`}
        />
      </label>
      <label className="text-xs font-medium text-brand-600">
        Segment reporting threshold
        <select
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className={`${inputCls} w-48`}
        >
          <option value={5}>5 — platform floor</option>
          <option value={10}>10 — recommended</option>
        </select>
      </label>
      <button
        type="button"
        onClick={save}
        disabled={status === "saving"}
        className="h-9 rounded-md bg-accent-500 px-4 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      {status === "saved" && (
        <span className="text-xs text-emerald-700">Saved.</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-600">Could not save.</span>
      )}
    </div>
  );
}
