"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { parseSegments } from "@/lib/audits";
import {
  contextSignals,
  provisionalStatus,
  type AuditContext,
} from "@/lib/context";

type Profile = NonNullable<AuditContext["profile"]>;
type Situation = NonNullable<AuditContext["situation"]>;
type Indicators = NonNullable<AuditContext["indicators"]>;
type Systems = NonNullable<AuditContext["systems"]>;
type Readiness = NonNullable<AuditContext["readiness"]>;

const field =
  "mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100";

const SITUATION: { key: keyof Situation; label: string }[] = [
  { key: "restructuring", label: "Restructuring / reorganisation" },
  { key: "mergerAcquisition", label: "Merger or acquisition" },
  { key: "leadershipChange", label: "Recent leadership change" },
  { key: "layoffsOrFreeze", label: "Layoffs or hiring freeze" },
  { key: "rapidHiring", label: "Rapid hiring" },
  { key: "newTechnology", label: "Major new technology rollout" },
  { key: "returnToOfficeChange", label: "Return-to-office change" },
  { key: "revenuePressure", label: "Revenue / financial pressure" },
  { key: "resignationSpike", label: "Recent spike in resignations" },
  { key: "absenceSpike", label: "Recent spike in absence" },
];

const SYSTEMS: { key: keyof Systems; label: string }[] = [
  { key: "hasEAP", label: "Employee Assistance Programme (EAP)" },
  { key: "hasOccupationalHealth", label: "Occupational health support" },
  { key: "managerMentalHealthTraining", label: "Manager mental-health training" },
  { key: "workloadReviewProcess", label: "Workload review process" },
  { key: "flexibleWorkingPolicy", label: "Flexible-working policy" },
  { key: "changeManagementProcess", label: "Change-management process" },
  { key: "hasWellbeingProgramme", label: "Wellbeing programme" },
];

const LEVELS = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
];
const BUDGETS = [
  { value: "none", label: "None" },
  { value: "limited", label: "Limited" },
  { value: "moderate", label: "Moderate" },
  { value: "significant", label: "Significant" },
];
const ARRANGEMENTS = [
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
  { value: "mixed", label: "Mixed" },
];
const GROWTH = [
  { value: "startup", label: "Start-up" },
  { value: "scaling", label: "Scaling" },
  { value: "steady", label: "Steady state" },
  { value: "restructuring", label: "Restructuring" },
  { value: "decline", label: "Decline" },
];

// ── presentational helpers ────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-brand-100 bg-white p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-900">{title}</h2>
      {hint && <p className="mt-1 text-xs text-brand-400">{hint}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Txt({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <label className={full ? "sm:col-span-2" : undefined}>
      <span className="block text-xs font-medium text-brand-600">{label}</span>
      <input className={field} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-brand-600">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </span>
      <input
        type="number"
        className={field}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
      />
    </label>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="block text-xs font-medium text-brand-600">{label}</span>
      <select className={field} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-brand-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-brand-300 text-accent-500 focus:ring-accent-200"
      />
      {label}
    </label>
  );
}

/** Drop undefined/empty-string/empty-array/empty-object keys; keep 0 and false. */
function pruneEmpty<T extends object>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = pruneEmpty(v as object);
      if (Object.keys(nested).length === 0) continue;
      out[k] = nested;
      continue;
    }
    out[k] = v;
  }
  return out as Partial<T>;
}

// ── the intake form ───────────────────────────────────────────────────────────

export function ContextForm({
  auditId,
  initialContext,
}: {
  auditId: string;
  initialContext: AuditContext;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialContext.profile ?? {});
  const [departmentsRaw, setDepartmentsRaw] = useState(
    (initialContext.profile?.departments ?? []).join(", "),
  );
  const [situation, setSituation] = useState<Situation>(
    initialContext.situation ?? {},
  );
  const [indicators, setIndicators] = useState<Indicators>(
    initialContext.indicators ?? {},
  );
  const [systems, setSystems] = useState<Systems>(initialContext.systems ?? {});
  const [readiness, setReadiness] = useState<Readiness>(
    initialContext.readiness ?? {},
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const build = (): AuditContext => {
    const situationFull: Situation = {};
    for (const { key } of SITUATION) situationFull[key] = !!situation[key];
    const systemsFull: Systems = {};
    for (const { key } of SYSTEMS) systemsFull[key] = !!systems[key];
    const departments = parseSegments(departmentsRaw);
    return pruneEmpty({
      profile: pruneEmpty({
        ...profile,
        departments: departments.length ? departments : undefined,
      }),
      situation: situationFull,
      systems: systemsFull,
      indicators: pruneEmpty(indicators),
      readiness: pruneEmpty(readiness),
    });
  };

  const draft = build();
  const prov = provisionalStatus(draft);
  const signals = contextSignals(draft);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch(`/api/audits/${auditId}/context`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Live provisional preview — demonstrates that context alters the plan. */}
      <div
        className={
          prov.provisional
            ? "rounded-xl border border-amber-200 bg-amber-50 p-4"
            : "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        }
      >
        <p className="text-sm font-semibold text-brand-900">
          {prov.provisional
            ? "Context incomplete — the plan will be marked PROVISIONAL"
            : "Context complete — the plan will be tailored to this organisation"}
        </p>
        {prov.provisional && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-brand-600">
            {prov.clarifyingQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        )}
        {signals.activeDisruptions.length > 0 && (
          <p className="mt-2 text-xs text-brand-700">
            Active context that will reshape interpretation:{" "}
            <span className="font-medium">
              {signals.activeDisruptions.join(", ")}
            </span>
            .
          </p>
        )}
      </div>

      <Section title="Company profile">
        <Num label="Headcount" value={profile.headcount} onChange={(v) => setProfile((p) => ({ ...p, headcount: v }))} />
        <Num label="Number of locations" value={profile.locations} onChange={(v) => setProfile((p) => ({ ...p, locations: v }))} />
        <Sel label="Work arrangement" value={profile.workArrangement ?? ""} options={ARRANGEMENTS} onChange={(v) => setProfile((p) => ({ ...p, workArrangement: (v || undefined) as Profile["workArrangement"] }))} />
        <Sel label="Growth stage" value={profile.growthStage ?? ""} options={GROWTH} onChange={(v) => setProfile((p) => ({ ...p, growthStage: (v || undefined) as Profile["growthStage"] }))} />
        <Txt label="Industry" value={profile.industry ?? ""} onChange={(v) => setProfile((p) => ({ ...p, industry: v }))} />
        <Txt label="Shift patterns" value={profile.shiftPatterns ?? ""} onChange={(v) => setProfile((p) => ({ ...p, shiftPatterns: v }))} />
        <Txt label="Departments (comma-separated)" full value={departmentsRaw} onChange={setDepartmentsRaw} />
        <Txt label="Workforce composition (notes)" full value={profile.workforceComposition ?? ""} onChange={(v) => setProfile((p) => ({ ...p, workforceComposition: v }))} />
        <Toggle label="Safety-critical work" checked={!!profile.safetyCritical} onChange={(v) => setProfile((p) => ({ ...p, safetyCritical: v }))} />
        <Toggle label="Customer-facing workforce" checked={!!profile.customerFacing} onChange={(v) => setProfile((p) => ({ ...p, customerFacing: v }))} />
        <Toggle label="Business is seasonal" checked={!!profile.seasonality?.isSeasonal} onChange={(v) => setProfile((p) => ({ ...p, seasonality: { ...p.seasonality, isSeasonal: v } }))} />
        <Toggle label="Currently in a seasonal peak" checked={!!profile.seasonality?.inPeakNow} onChange={(v) => setProfile((p) => ({ ...p, seasonality: { ...p.seasonality, inPeakNow: v } }))} />
      </Section>

      <Section title="Current situation" hint="Tick anything currently happening — unticked means not occurring.">
        {SITUATION.map(({ key, label }) => (
          <Toggle key={key} label={label} checked={!!situation[key]} onChange={(v) => setSituation((s) => ({ ...s, [key]: v }))} />
        ))}
      </Section>

      <Section title="Aggregated indicators" hint="Org-level figures only — never individual data. Leave blank if unknown.">
        <Num label="Voluntary turnover" suffix="%" value={indicators.voluntaryTurnoverPct} onChange={(v) => setIndicators((i) => ({ ...i, voluntaryTurnoverPct: v }))} />
        <Num label="Absence rate" suffix="%" value={indicators.absenceRatePct} onChange={(v) => setIndicators((i) => ({ ...i, absenceRatePct: v }))} />
        <Num label="Avg overtime" suffix="hrs/wk" value={indicators.overtimeHoursPerWeek} onChange={(v) => setIndicators((i) => ({ ...i, overtimeHoursPerWeek: v }))} />
        <Num label="Vacancy rate" suffix="%" value={indicators.vacancyRatePct} onChange={(v) => setIndicators((i) => ({ ...i, vacancyRatePct: v }))} />
        <Num label="Error / rework rate" suffix="%" value={indicators.errorReworkRatePct} onChange={(v) => setIndicators((i) => ({ ...i, errorReworkRatePct: v }))} />
        <Num label="Engagement score" suffix="/100" value={indicators.engagementScore} onChange={(v) => setIndicators((i) => ({ ...i, engagementScore: v }))} />
        <Num label="Wellbeing-programme utilisation" suffix="%" value={indicators.wellbeingUtilisationPct} onChange={(v) => setIndicators((i) => ({ ...i, wellbeingUtilisationPct: v }))} />
      </Section>

      <Section title="Existing systems" hint="What is already in place.">
        {SYSTEMS.map(({ key, label }) => (
          <Toggle key={key} label={label} checked={!!systems[key]} onChange={(v) => setSystems((s) => ({ ...s, [key]: v }))} />
        ))}
      </Section>

      <Section title="Implementation readiness" hint="Affects sequencing and feasibility — never the severity of a finding.">
        <Sel label="Budget band" value={readiness.budgetBand ?? ""} options={BUDGETS} onChange={(v) => setReadiness((r) => ({ ...r, budgetBand: (v || undefined) as Readiness["budgetBand"] }))} />
        <Sel label="Executive sponsor availability" value={readiness.sponsorAvailability ?? ""} options={LEVELS} onChange={(v) => setReadiness((r) => ({ ...r, sponsorAvailability: (v || undefined) as Readiness["sponsorAvailability"] }))} />
        <Sel label="HR capacity" value={readiness.hrCapacity ?? ""} options={LEVELS} onChange={(v) => setReadiness((r) => ({ ...r, hrCapacity: (v || undefined) as Readiness["hrCapacity"] }))} />
        <Sel label="Manager capacity" value={readiness.managerCapacity ?? ""} options={LEVELS} onChange={(v) => setReadiness((r) => ({ ...r, managerCapacity: (v || undefined) as Readiness["managerCapacity"] }))} />
        <Sel label="Change fatigue" value={readiness.changeFatigue ?? ""} options={LEVELS} onChange={(v) => setReadiness((r) => ({ ...r, changeFatigue: (v || undefined) as Readiness["changeFatigue"] }))} />
        <Sel label="Employee trust" value={readiness.employeeTrust ?? ""} options={LEVELS} onChange={(v) => setReadiness((r) => ({ ...r, employeeTrust: (v || undefined) as Readiness["employeeTrust"] }))} />
        <Txt label="Constraints" full value={readiness.constraints ?? ""} onChange={(v) => setReadiness((r) => ({ ...r, constraints: v }))} />
        <Txt label="Previous interventions" full value={readiness.previousInterventions ?? ""} onChange={(v) => setReadiness((r) => ({ ...r, previousInterventions: v }))} />
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="h-10 rounded-md bg-accent-500 px-5 text-sm font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save context"}
        </button>
        {status === "saved" && <span className="text-sm text-emerald-700">Saved.</span>}
        {status === "error" && (
          <span className="text-sm text-red-600">Could not save — try again.</span>
        )}
      </div>
    </form>
  );
}
