"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditStatus } from "@/types";

/**
 * Open/close an audit from the dashboard. Closing stops new survey submissions
 * (the /api/responses route returns 409 for a non-open audit).
 */
export function AuditStatusControl({
  auditId,
  status,
}: {
  auditId: string;
  status: AuditStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = status === "closed" ? "open" : "closed";
  const label = status === "closed" ? "Reopen audit" : "Close audit";

  async function change() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/audits/${auditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={change}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-50 disabled:opacity-60"
      >
        {busy ? "Updating…" : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
