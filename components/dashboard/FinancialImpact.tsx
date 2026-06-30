"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
import type { CalculatorInput } from "@/lib/calculator";
import { CURRENCY_META } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Currency, DimensionScores, SizeBand } from "@/types";

/**
 * THE LOOP, in the dashboard. Starts from representative inputs for the org's
 * size, lets the owner adjust the few figures that matter, and re-derives the
 * cost from THIS audit's actual 5C scores — showing generic vs audit-adjusted
 * and the delta, with the dimensions that drove it.
 */
export function FinancialImpact({
  dimensions,
  sizeBand,
  concentratedSegment,
  auditId,
  savedInputs,
}: {
  dimensions: DimensionScores;
  sizeBand: SizeBand | null;
  concentratedSegment: string | null;
  /** When present (real dashboard), the owner can save these figures. */
  auditId?: string;
  /** The owner's previously-saved figures, if any. */
  savedInputs?: CalculatorInput | null;
}) {
  const seed = savedInputs ?? representativeBaseInputs(sizeBand);
  const [employees, setEmployees] = useState(seed.employees);
  const [avgSalary, setAvgSalary] = useState(seed.avgSalary);
  const [currency, setCurrency] = useState<Currency>(seed.currency);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const baseInputs = useMemo(
    () => ({
      ...(savedInputs ?? representativeBaseInputs(sizeBand, currency)),
      employees,
      avgSalary,
      currency,
    }),
    [savedInputs, sizeBand, employees, avgSalary, currency],
  );

  const result = useMemo(
    () => auditAdjustedCost(baseInputs, dimensions, { concentratedSegment }),
    [baseInputs, dimensions, concentratedSegment],
  );

  async function saveFigures() {
    if (!auditId) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/cost/${auditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseInputs),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const money = (n: number) => formatCurrency(n, currency);
  const symbol = CURRENCY_META[currency].symbol;
  const deltaPct =
    result.genericTotal > 0
      ? Math.round((result.delta / result.genericTotal) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Employees">
          <input
            type="number"
            min={1}
            value={employees}
            onChange={(e) => setEmployees(Number(e.target.value) || 0)}
            className={INPUT}
          />
        </Field>
        <Field label={`Average salary (${symbol})`}>
          <input
            type="number"
            min={0}
            step={1000}
            value={avgSalary}
            onChange={(e) => setAvgSalary(Number(e.target.value) || 0)}
            className={INPUT}
          />
        </Field>
        <Field label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className={INPUT}
          >
            <option value="GBP">GBP (£)</option>
            <option value="INR">INR (₹)</option>
          </select>
        </Field>
      </div>

      {/* Generic → adjusted */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-brand-100 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-400">
            Generic estimate
          </p>
          <p className="mt-1 font-serif text-3xl font-semibold text-brand-700">
            {money(result.genericTotal)}
          </p>
          <p className="mt-1 text-xs text-brand-400">industry averages</p>
        </div>
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-700">
            Audit-adjusted
          </p>
          <p className="mt-1 font-serif text-3xl font-semibold text-accent-900">
            {money(result.adjustedTotal)}
          </p>
          <p className="mt-1 text-xs text-accent-700">
            {result.delta === 0
              ? "in line with the generic estimate"
              : `${result.delta > 0 ? "+" : ""}${money(result.delta)} (${deltaPct > 0 ? "+" : ""}${deltaPct}%) from your actual scores`}
          </p>
        </div>
      </div>

      {/* Explanation */}
      {result.explanation.length > 0 && (
        <ul className="space-y-1.5">
          {result.explanation.map((line) => (
            <li key={line} className="flex gap-2 text-sm text-brand-600">
              <span aria-hidden className="text-accent-500">
                →
              </span>
              {line}
            </li>
          ))}
        </ul>
      )}

      {auditId && (
        <div className="flex flex-wrap items-center gap-3 border-t border-brand-100 pt-4">
          <button
            type="button"
            onClick={saveFigures}
            disabled={saveState === "saving"}
            className="rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {saveState === "saving" ? "Saving…" : "Save these figures for the report"}
          </button>
          {saveState === "saved" && (
            <span className="text-xs text-emerald-700">
              Saved — your PDF report now uses these figures.
            </span>
          )}
          {saveState === "error" && (
            <span className="text-xs text-red-600">Could not save. Try again.</span>
          )}
          {saveState === "idle" && (
            <span className="text-xs text-brand-400">
              Until you save real figures, the PDF is labelled sector-average.
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-brand-400">
        Modelled estimate based on published research, not a guarantee. Every
        adjustment is bounded to ±40%.{" "}
        <Link
          href="/methodology"
          className="font-medium text-accent-600 hover:text-accent-700"
        >
          How we model this →
        </Link>
      </p>
    </div>
  );
}

const INPUT =
  "mt-1 h-10 w-full rounded-md border border-brand-200 px-3 text-sm text-brand-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-brand-600">{label}</span>
      {children}
    </label>
  );
}
