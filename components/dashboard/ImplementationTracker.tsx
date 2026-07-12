"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ACTION_STATUS_LABEL,
  FIDELITY_CHECKS,
  fidelityScore,
  type ActionStatus,
  type FidelityRecord,
  type TrackerAction,
} from "@/lib/evaluation";

const EMPTY_FIDELITY: FidelityRecord = {
  started: false,
  deliveredToIntendedGroup: false,
  deliveredAsDesigned: false,
  managersTrained: false,
  processesUsed: false,
  resourcesProvided: false,
  leadershipConsistent: false,
  sustained: false,
};

const field =
  "mt-1 h-9 rounded-md border border-brand-200 px-3 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

/** Client-facing implementation tracker. Mutations go through the owner-or-
 *  consultant API; a different org cannot read or write these actions. */
export function ImplementationTracker({
  auditId,
  actions,
}: {
  auditId: string;
  actions: TrackerAction[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [kpi, setKpi] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          owner: owner || undefined,
          deadline: deadline || undefined,
          kpi: kpi || undefined,
        }),
      });
      if (res.ok) {
        setTitle("");
        setOwner("");
        setDeadline("");
        setKpi("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/audits/${auditId}/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/audits/${auditId}/actions/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={add}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4"
      >
        <label className="text-xs font-medium text-brand-600">
          Action
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Set the priority ceiling"
            className={`${field} block w-56`}
          />
        </label>
        <label className="text-xs font-medium text-brand-600">
          Owner
          <input value={owner} onChange={(e) => setOwner(e.target.value)} className={`${field} block w-36`} />
        </label>
        <label className="text-xs font-medium text-brand-600">
          Deadline
          <input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Week 4" className={`${field} block w-28`} />
        </label>
        <label className="text-xs font-medium text-brand-600">
          KPI
          <input value={kpi} onChange={(e) => setKpi(e.target.value)} className={`${field} block w-36`} />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-9 rounded-md bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {actions.length === 0 ? (
        <p className="text-sm text-brand-500">
          No actions tracked yet. Add the first from the intervention plan above.
        </p>
      ) : (
        <div className="space-y-3">
          {actions.map((a) => (
            <ActionRow key={a.id} action={a} onPatch={patch} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  action,
  onPatch,
  onRemove,
}: {
  action: TrackerAction;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
}) {
  const [evidence, setEvidence] = useState(action.evidence ?? "");
  const fidelity = action.fidelity ?? EMPTY_FIDELITY;
  const score = action.fidelity ? fidelityScore(action.fidelity) : null;

  return (
    <div className="rounded-xl border border-brand-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-brand-900">{action.title}</span>
        {action.owner && <span className="text-xs text-brand-400">· {action.owner}</span>}
        {action.deadline && <span className="text-xs text-brand-400">· {action.deadline}</span>}
        <select
          value={action.status}
          onChange={(e) => onPatch(action.id, { status: e.target.value as ActionStatus })}
          className="ml-auto h-8 rounded-md border border-brand-200 px-2 text-xs outline-none focus:border-accent-400"
        >
          {(Object.keys(ACTION_STATUS_LABEL) as ActionStatus[]).map((s) => (
            <option key={s} value={s}>
              {ACTION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onRemove(action.id)} className="text-xs text-red-600 hover:underline">
          Remove
        </button>
      </div>
      {action.kpi && <p className="mt-1 text-xs text-brand-500">KPI: {action.kpi}</p>}
      <input
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        onBlur={() => {
          if (evidence !== (action.evidence ?? "")) onPatch(action.id, { evidence: evidence || null });
        }}
        placeholder="Evidence of completion"
        className={`${field} block w-full`}
      />
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-accent-700">
          Fidelity{score !== null ? ` (${score}%)` : ""}
        </summary>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {FIDELITY_CHECKS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-brand-700">
              <input
                type="checkbox"
                checked={!!fidelity[key]}
                onChange={(e) => onPatch(action.id, { fidelity: { ...fidelity, [key]: e.target.checked } })}
                className="h-4 w-4 rounded border-brand-300 text-accent-500 focus:ring-accent-200"
              />
              {label}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
