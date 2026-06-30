"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalculatorInputSchema,
  computeBurnoutCost,
  type CalculatorInput,
} from "@/lib/calculator";
import { getCoefficient } from "@/lib/coefficients";
import { CURRENCY_META } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Currency, RiskLevel, WorkMode } from "@/types";

const DEFAULTS: CalculatorInput = {
  employees: 100,
  avgSalary: 45000,
  sickDaysPerEmployee: 5,
  highStressPct: 35,
  turnoverRatePct: 15,
  // Left undefined on purpose: the engine starts from cited research defaults
  // (shown as sources below), which the user can override.
  replacementCostPerEmployee: undefined,
  productivityLossPct: undefined,
  managerHoursOnPeoplePerMonth: 30,
  managerHourlyCost: 60,
  workMode: "hybrid",
  hasWellbeingProgram: false,
  recentTurmoil: false,
  currency: "GBP",
};

// Sensible starting values when a user switches a field OFF research-default.
const MANUAL_FALLBACK = { replacementCostPerEmployee: 8000, productivityLossPct: 12 };

const RISK_STYLES: Record<RiskLevel, string> = {
  Low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Moderate: "bg-amber-50 text-amber-800 ring-amber-200",
  High: "bg-orange-50 text-orange-800 ring-orange-200",
  Critical: "bg-red-50 text-red-700 ring-red-200",
};

type LeadStatus = "idle" | "open" | "submitting" | "success" | "error";

export function Calculator() {
  const [input, setInput] = useState<CalculatorInput>(DEFAULTS);

  const parsed = useMemo(() => CalculatorInputSchema.safeParse(input), [input]);
  const result = useMemo(
    () => (parsed.success ? computeBurnoutCost(parsed.data) : null),
    [parsed],
  );

  const symbol = CURRENCY_META[input.currency].symbol;
  const money = (n: number) => formatCurrency(n, input.currency);

  function set<K extends keyof CalculatorInput>(
    key: K,
    value: CalculatorInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ── Form ─────────────────────────────────────────────── */}
      <form className="space-y-8" aria-label="Burnout cost inputs">
        <Group title="About your company">
          <NumberField
            id="employees"
            label="Number of employees"
            value={input.employees}
            min={1}
            onChange={(v) => set("employees", v)}
          />
          <NumberField
            id="avgSalary"
            label="Average annual salary"
            value={input.avgSalary}
            min={0}
            step={1000}
            prefix={symbol}
            onChange={(v) => set("avgSalary", v)}
          />
          <SelectField
            id="currency"
            label="Currency"
            value={input.currency}
            options={[
              { value: "GBP", label: "GBP (£)" },
              { value: "INR", label: "INR (₹)" },
            ]}
            onChange={(v) => set("currency", v as Currency)}
          />
          <SelectField
            id="workMode"
            label="Primary work mode"
            value={input.workMode}
            options={[
              { value: "onsite", label: "Onsite" },
              { value: "hybrid", label: "Hybrid" },
              { value: "remote", label: "Remote" },
            ]}
            onChange={(v) => set("workMode", v as WorkMode)}
          />
        </Group>

        <Group title="Costs & turnover">
          <NumberField
            id="sickDaysPerEmployee"
            label="Stress-related sick days / employee / year"
            value={input.sickDaysPerEmployee}
            min={0}
            step={0.5}
            onChange={(v) => set("sickDaysPerEmployee", v)}
          />
          <NumberField
            id="turnoverRatePct"
            label="Annual turnover rate"
            value={input.turnoverRatePct}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => set("turnoverRatePct", v)}
          />
          <CoefficientField
            id="replacementCostPerEmployee"
            label="Replacement cost / employee"
            value={input.replacementCostPerEmployee}
            manualFallback={MANUAL_FALLBACK.replacementCostPerEmployee}
            prefix={symbol}
            step={500}
            onChange={(v) => set("replacementCostPerEmployee", v)}
          />
          <NumberField
            id="managerHoursOnPeoplePerMonth"
            label="Manager hours / month on people issues"
            value={input.managerHoursOnPeoplePerMonth}
            min={0}
            onChange={(v) => set("managerHoursOnPeoplePerMonth", v)}
          />
          <NumberField
            id="managerHourlyCost"
            label="Manager hourly cost"
            value={input.managerHourlyCost}
            min={0}
            step={5}
            prefix={symbol}
            onChange={(v) => set("managerHourlyCost", v)}
          />
        </Group>

        <Group title="Workload signals">
          <CoefficientField
            id="productivityLossPct"
            label="Estimated productivity loss (presenteeism)"
            value={input.productivityLossPct}
            manualFallback={MANUAL_FALLBACK.productivityLossPct}
            suffix="%"
            step={1}
            onChange={(v) => set("productivityLossPct", v)}
          />
          <NumberField
            id="highStressPct"
            label="Share of staff in high stress"
            value={input.highStressPct}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => set("highStressPct", v)}
          />
          <ToggleField
            id="hasWellbeingProgram"
            label="We already run a wellbeing programme"
            checked={input.hasWellbeingProgram}
            onChange={(v) => set("hasWellbeingProgram", v)}
          />
          <ToggleField
            id="recentTurmoil"
            label="Recent restructuring, layoffs, or turmoil"
            checked={input.recentTurmoil}
            onChange={(v) => set("recentTurmoil", v)}
          />
        </Group>
      </form>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        {result ? (
          <Results result={result} input={input} money={money} />
        ) : (
          <p className="rounded-xl border border-brand-100 bg-brand-50 p-6 text-sm text-brand-600">
            Enter valid figures to see your estimate. All inputs must be
            non-negative, and percentages between 0 and 100.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Results panel ───────────────────────────────────────────────

function Results({
  result,
  input,
  money,
}: {
  result: ReturnType<typeof computeBurnoutCost>;
  input: CalculatorInput;
  money: (n: number) => string;
}) {
  const costPerEmployee =
    input.employees > 0 ? Math.round(result.total / input.employees) : 0;

  const cards: { label: string; value: number; formula: string }[] = [
    {
      label: "Absenteeism",
      value: result.breakdown.absenteeism,
      formula: "employees × sick days × (salary ÷ 260)",
    },
    {
      label: "Presenteeism",
      value: result.breakdown.presenteeism,
      formula: "employees × salary × productivity-loss %",
    },
    {
      label: "Attrition",
      value: result.breakdown.attrition,
      formula: "employees × turnover % × replacement cost",
    },
    {
      label: "Manager overload",
      value: result.breakdown.managerOverload,
      formula: "monthly people-hours × hourly cost × 12",
    },
    {
      label: "Cost per employee",
      value: costPerEmployee,
      formula: "total ÷ employees",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Headline */}
      <div className="rounded-2xl bg-brand-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-300">
              Estimated annual burnout-related cost
            </p>
            <p className="mt-1 font-serif text-4xl font-semibold">
              {money(result.total)}
            </p>
            <p className="mt-1 text-sm text-brand-300">
              {result.totalAsPctOfPayroll}% of annual payroll
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
              RISK_STYLES[result.riskLevel],
            )}
          >
            {result.riskLevel} risk
          </span>
        </div>
      </div>

      {/* Cost cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-brand-100 bg-white p-4"
            title={card.formula}
          >
            <p className="text-xs font-medium text-brand-500">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-brand-900">
              {money(card.value)}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-brand-400">
              {card.formula}
            </p>
          </div>
        ))}
      </div>

      {/* Top drivers */}
      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <p className="text-sm font-semibold text-brand-900">
          Biggest cost drivers
        </p>
        <ul className="mt-3 space-y-2">
          {result.topDrivers.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-brand-600">{d.label}</span>
              <span className="text-sm font-semibold text-brand-900">
                {d.formatted}{" "}
                <span className="font-normal text-brand-400">
                  ({d.shareOfTotalPct}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Next step */}
      <div className="rounded-xl border border-accent-200 bg-accent-50 p-5">
        <p className="text-sm font-semibold text-accent-700">
          Recommended next step
        </p>
        <p className="mt-1 text-sm text-accent-900">
          {result.recommendedNextStep}
        </p>
      </div>

      {/* Sources & assumptions — provenance is the point */}
      <div className="rounded-xl border border-brand-100 bg-white p-5">
        <p className="text-sm font-semibold text-brand-900">
          Assumptions &amp; sources
        </p>
        {result.researchDefaults.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {result.researchDefaults.map((rd) => {
              const coef = getCoefficient(rd.coefficientKey);
              return (
                <li key={rd.coefficientKey} className="text-xs text-brand-600">
                  <span className="font-medium text-brand-800">
                    {coef?.name ?? rd.label}:
                  </span>{" "}
                  {coef?.value}
                  {coef ? (
                    <span className="text-brand-400">
                      {" "}
                      — {coef.source.publication}. Modelled estimate.
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-brand-500">
            All figures use the values you entered. Every modelled coefficient is
            documented on the methodology page.
          </p>
        )}
        <Link
          href="/methodology"
          className="mt-3 inline-block text-xs font-medium text-accent-600 hover:text-accent-700"
        >
          How we model these figures →
        </Link>
      </div>

      <LeadCapture input={input} />

      <p className="text-xs text-brand-400">{result.estimateNote}</p>
    </div>
  );
}

// ── Gated PDF lead capture ──────────────────────────────────────

function LeadCapture({ input }: { input: CalculatorInput }) {
  const [status, setStatus] = useState<LeadStatus>("idle");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    companyName: "",
  });

  const [emailed, setEmailed] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, calculatorPayload: input }),
      });
      if (!res.ok) throw new Error("Request failed");
      const body = (await res.json().catch(() => null)) as {
        emailed?: boolean;
      } | null;
      // Only record an email as sent if the server actually delivered it.
      setEmailed(Boolean(body?.emailed));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  async function downloadPdf() {
    const res = await fetch("/api/calculator-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, company: form.companyName }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "burnout-cost-report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        <p>
          Your report is ready — download it below.
          {emailed
            ? " We've also emailed a copy to you."
            : " The on-screen estimate above is always free."}
        </p>
        <button
          type="button"
          onClick={downloadPdf}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-brand-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-800"
        >
          Download your report (PDF) ↓
        </button>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStatus("open")}
        className="w-full rounded-md bg-accent-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-600"
      >
        Get the full PDF report →
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-brand-100 bg-white p-5"
    >
      <p className="text-sm font-semibold text-brand-900">
        Where should we send your report?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          id="lead-name"
          label="Name"
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        />
        <TextInput
          id="lead-role"
          label="Role"
          value={form.role}
          onChange={(v) => setForm((f) => ({ ...f, role: v }))}
        />
        <TextInput
          id="lead-email"
          label="Work email"
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
        />
        <TextInput
          id="lead-company"
          label="Company"
          value={form.companyName}
          onChange={(v) => setForm((f) => ({ ...f, companyName: v }))}
        />
      </div>
      {status === "error" && (
        <p className="text-xs text-red-600">
          Something went wrong. Please check your details and try again.
        </p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-md bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Email me the report"}
      </button>
      <p className="text-[11px] text-brand-400">
        We email your report and may follow up. Your inputs are not shared.
      </p>
    </form>
  );
}

// ── Small form primitives ───────────────────────────────────────

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-brand-100 bg-white p-5">
      <legend className="px-1 text-sm font-semibold text-brand-900">
        {title}
      </legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-brand-600">
        {label}
      </label>
      <div className="relative mt-1">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-brand-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
          className={cn(
            "h-10 w-full rounded-md border border-brand-200 bg-white text-sm text-brand-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100",
            prefix ? "pl-7 pr-3" : "px-3",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-brand-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A number input that can defer to a cited research coefficient. When the user
 * leaves it on "research default" (value === undefined), the engine fills it
 * from lib/coefficients and cites the source in the results.
 */
function CoefficientField({
  id,
  label,
  value,
  manualFallback,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  id: string;
  label: string;
  value: number | undefined;
  manualFallback: number;
  onChange: (v: number | undefined) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  const usingDefault = value === undefined;
  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="block text-xs font-medium text-brand-600">
        {label}
      </label>
      <div className="relative mt-1">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-brand-400">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          disabled={usingDefault}
          placeholder={usingDefault ? "research default" : undefined}
          value={usingDefault ? "" : value}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
          className={cn(
            "h-10 w-full rounded-md border border-brand-200 text-sm text-brand-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100",
            usingDefault ? "bg-brand-50 text-brand-400" : "bg-white",
            prefix ? "pl-7 pr-3" : "px-3",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-brand-400">
            {suffix}
          </span>
        )}
      </div>
      <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[11px] text-brand-500">
        <input
          type="checkbox"
          checked={usingDefault}
          onChange={(e) =>
            onChange(e.target.checked ? undefined : manualFallback)
          }
          className="h-3.5 w-3.5 rounded border-brand-300 text-accent-500 focus:ring-accent-400"
        />
        Use research default (cited below)
      </label>
    </div>
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-brand-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-brand-200 bg-white px-3 text-sm text-brand-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-brand-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-brand-200 bg-white px-3 text-sm text-brand-900 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 sm:col-span-2"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-brand-300 text-accent-500 focus:ring-accent-400"
      />
      <span className="text-sm text-brand-700">{label}</span>
    </label>
  );
}
