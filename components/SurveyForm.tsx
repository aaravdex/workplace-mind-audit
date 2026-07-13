"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/Disclaimer";
import { QUESTIONS, QUESTIONS_BY_DIMENSION } from "@/content/questions";
import { OPEN_TEXT_QUESTIONS } from "@/lib/openText";
import { DIMENSIONS, DIMENSION_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LikertValue } from "@/types";

const SCALE: { value: LikertValue; label: string }[] = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

const PREFER_NOT = "__prefer_not__";

type Answers = Record<number, LikertValue | null>;

export function SurveyForm({
  token,
  title,
  segments,
  collectOpenText = false,
  initialDone = false,
}: {
  token: string;
  title: string;
  segments: string[];
  collectOpenText?: boolean;
  /** Dev/preview only: render the thank-you state directly. */
  initialDone?: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [openText, setOpenText] = useState<Record<number, string>>({});
  const [segment, setSegment] = useState<string>(PREFER_NOT);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">(
    initialDone ? "done" : "idle",
  );

  const answered = useMemo(
    () => Object.values(answers).filter((v) => v != null).length,
    [answers],
  );
  const progress = Math.round((answered / QUESTIONS.length) * 100);

  function setAnswer(id: number, value: LikertValue) {
    setAnswers((prev) => ({
      ...prev,
      // Click the selected value again to clear it (skip the question).
      [id]: prev[id] === value ? null : value,
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          segment: segment === PREFER_NOT ? null : segment,
          answers,
          openText,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") return <ThankYou />;

  return (
    <div className="min-h-screen bg-brand-50 pb-24">
      {/* Sticky progress */}
      <div className="sticky top-0 z-20 border-b border-brand-100 bg-white/95 backdrop-blur">
        <Container className="flex items-center gap-4 py-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-brand-500">
            {answered}/{QUESTIONS.length}
          </span>
        </Container>
      </div>

      <Container className="max-w-2xl py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600">
          {title}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-brand-900">
          A few honest answers — completely anonymous
        </h1>

        {/* Disclaimer + privacy first */}
        <div className="mt-5 space-y-3 rounded-xl border border-brand-100 bg-white p-5 text-sm text-brand-600">
          <p>
            This takes about seven minutes. Your individual answers are{" "}
            <strong className="text-brand-800">never</strong> shown to your
            employer — only aggregated patterns across many people are reported,
            and only when enough people respond. We do not collect your name,
            email, or IP address.
          </p>
          <p>Every question is optional — skip anything you prefer not to answer.</p>
          <div className="rounded-lg bg-brand-50 p-3">
            <Disclaimer />
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-10">
          {/* Optional segment */}
          {segments.length > 0 && (
            <div className="rounded-xl border border-brand-100 bg-white p-5">
              <label
                htmlFor="segment"
                className="block text-sm font-medium text-brand-800"
              >
                Which team or department are you in?
              </label>
              <select
                id="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-brand-200 px-3 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
              >
                <option value={PREFER_NOT}>Prefer not to say</option>
                {segments.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-brand-400">
                A team is only ever reported when at least five people from it
                respond.
              </p>
            </div>
          )}

          {/* Questions grouped by C */}
          {DIMENSIONS.map((dimension) => (
            <fieldset key={dimension}>
              <legend className="font-serif text-lg font-semibold text-brand-900">
                {DIMENSION_META[dimension].label}
              </legend>
              <p className="mt-1 text-sm text-brand-500">
                {DIMENSION_META[dimension].blurb}
              </p>

              <div className="mt-4 space-y-3">
                {QUESTIONS_BY_DIMENSION[dimension].map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-brand-100 bg-white p-4"
                  >
                    <p className="text-sm text-brand-800">{q.text}</p>
                    <div
                      role="radiogroup"
                      aria-label={q.text}
                      className="mt-3 grid grid-cols-5 gap-1.5"
                    >
                      {SCALE.map((opt) => {
                        const selected = answers[q.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            title={opt.label}
                            onClick={() => setAnswer(q.id, opt.value)}
                            className={cn(
                              "flex h-10 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                              selected
                                ? "border-accent-500 bg-accent-500 text-white"
                                : "border-brand-200 bg-white text-brand-600 hover:border-accent-300 hover:bg-accent-50",
                            )}
                          >
                            {opt.value}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-brand-400">
                      <span>Strongly disagree</span>
                      <span>Strongly agree</span>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}

          {collectOpenText && (
            <fieldset>
              <legend className="font-serif text-lg font-semibold text-brand-900">
                In your own words (optional)
              </legend>
              <p className="mt-1 text-sm text-brand-500">
                Free text — please avoid names or anything that could identify you
                or anyone else.
              </p>
              <div className="mt-4 space-y-4">
                {OPEN_TEXT_QUESTIONS.map((q) => (
                  <div key={q.id} className="rounded-xl border border-brand-100 bg-white p-4">
                    <label htmlFor={`ot-${q.id}`} className="text-sm text-brand-800">
                      {q.text}
                    </label>
                    <textarea
                      id={`ot-${q.id}`}
                      rows={2}
                      value={openText[q.id] ?? ""}
                      onChange={(e) =>
                        setOpenText((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      className="mt-2 w-full rounded-md border border-brand-200 px-3 py-2 text-sm outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {status === "error" && (
            <p className="text-sm text-red-600">
              Something went wrong submitting your response. Please try again.
            </p>
          )}

          <div className="sticky bottom-4">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="h-12 w-full rounded-lg bg-brand-900 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              {status === "submitting"
                ? "Submitting…"
                : "Submit anonymously"}
            </button>
          </div>
        </form>
      </Container>
    </div>
  );
}

function ThankYou() {
  const resources: { label: string; href: string }[] = [
    { label: "Mind — mental health support", href: "https://www.mind.org.uk/" },
    {
      label: "Mental Health Foundation",
      href: "https://www.mentalhealth.org.uk/",
    },
    { label: "Samaritans (free, 24/7)", href: "https://www.samaritans.org/" },
  ];

  return (
    <div className="flex min-h-screen items-center bg-brand-50">
      <Container className="max-w-xl py-16 text-center">
        <div
          aria-hidden
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700"
        >
          ✓
        </div>
        <h1 className="mt-5 font-serif text-3xl font-semibold text-brand-900">
          Thank you
        </h1>
        <p className="mt-3 text-brand-600">
          Your anonymous response has been recorded. It will be combined with
          others to help improve working conditions — and is never shown to your
          employer on its own.
        </p>

        <div className="mt-8 rounded-xl border border-brand-100 bg-white p-6 text-left">
          <h2 className="text-sm font-semibold text-brand-900">
            General wellbeing resources
          </h2>
          <p className="mt-1 text-xs text-brand-400">
            Independent organisations — not affiliated with us, and not a
            substitute for professional advice.
          </p>
          <ul className="mt-3 space-y-2">
            {resources.map((r) => (
              <li key={r.href}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-accent-600 hover:text-accent-700"
                >
                  {r.label} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </div>
  );
}
