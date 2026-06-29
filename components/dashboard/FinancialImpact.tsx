"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { auditAdjustedCost } from "@/lib/costModel";
import { representativeBaseInputs } from "@/lib/cost-defaults";
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
}: {
  dimensions: DimensionScores;
  sizeBand: SizeBand | null;
  concentratedSegment: string | null;
}) {
  const seed = representativeBaseInputs(sizeBand);
  const [employees, setEmployees] = useState(seed.employees);
  const [avgSalary, setAvgSalary] = useState(seed.avgSalary);
  const [currency, setCurrency] = useState<Currency>("GBP");

  const result = useMemo(() => {
    const base = {
      ...representativeBaseInputs(sizeBand, currency),
      employees,
      avgSalary,
      currency,
    };
    return auditAdjustedCost(base, dimensions, { concentratedSegment });
  }, [sizeBand, employees, avgSalary, currency, dimensions, concentratedSegment]);

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
