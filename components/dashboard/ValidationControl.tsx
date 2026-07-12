"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VALIDATION_STATUS_LABEL, type ValidationStatus } from "@/lib/validation";

/** Consultant-only control to set a finding's validation status. */
export function ValidationControl({
  auditId,
  refId,
  current,
}: {
  auditId: string;
  refId: string;
  current: ValidationStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ValidationStatus>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save(next: ValidationStatus) {
    setStatus(next);
    setSaving(true);
    setError(false);
    try {
      const res = await fetch(`/api/audits/${auditId}/validation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refId, status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus(current);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <select
        value={status}
        disabled={saving}
        onChange={(e) => save(e.target.value as ValidationStatus)}
        className="h-7 rounded-md border border-brand-200 px-2 text-xs outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 disabled:opacity-60"
        aria-label="Set validation status"
      >
        {(Object.keys(VALIDATION_STATUS_LABEL) as ValidationStatus[]).map((s) => (
          <option key={s} value={s}>
            {VALIDATION_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-red-600">not saved</span>}
    </span>
  );
}
