import { describe, expect, it } from "vitest";
import { analyseOpenText, type OpenTextEntry } from "@/lib/thematicAnalysis";

const e = (text: string, segment: string | null = null, questionId?: number): OpenTextEntry => ({
  text,
  segment,
  questionId,
});

const opts = { reportingThreshold: 5, allowVerbatims: false };

describe("Phase 1 — familiarisation", () => {
  it("describes the dataset without interpreting it", () => {
    const ta = analyseOpenText(
      [
        e("Too much workload and impossible deadlines", null, 201),
        e("Understaffed for months", null, 201),
        e("", null, 201), // empty is dropped
        e("My manager never has time for a 1:1", null, 203),
      ],
      opts,
    );
    expect(ta.familiarisation.totalComments).toBe(3);
    expect(ta.familiarisation.respondentsWithText).toBe(3);
    expect(ta.familiarisation.byQuestion.find((q) => q.questionId === 201)!.count).toBe(2);
    expect(ta.familiarisation.byQuestion.find((q) => q.questionId === 201)!.text).toMatch(/pressure/i);
    expect(ta.familiarisation.meanWordCount).toBeGreaterThan(0);
  });

  it("counts comments the codebook did not catch (honesty signal)", () => {
    const ta = analyseOpenText([e("The office plants are lovely"), e("workload is too much")], opts);
    expect(ta.familiarisation.uncodedCount).toBe(1); // only the workload one codes
  });
});

describe("Phase 2 — coding", () => {
  it("assigns semantic codes with counts and can multi-code one comment", () => {
    const ta = analyseOpenText(
      [e("Understaffed and my manager micromanages every detail"), e("understaffed again")],
      opts,
    );
    const understaffing = ta.codes.find((c) => c.id === "understaffing")!;
    expect(understaffing.count).toBe(2);
    expect(ta.codes.find((c) => c.id === "micromanagement")!.count).toBe(1);
    expect(understaffing.definition).toMatch(/enough people/i);
  });

  it("uses word boundaries so 'manage' does not catch 'management'", () => {
    // "management" should NOT trigger the single-word manager keyword "manager".
    const ta = analyseOpenText([e("the management style here is fine")], opts);
    expect(ta.codes.find((c) => c.id === "manager-support")).toBeUndefined();
  });

  it("orders codes by frequency", () => {
    const ta = analyseOpenText(
      [e("workload too much"), e("workload too much"), e("unclear priorities")],
      opts,
    );
    expect(ta.codes[0].count).toBeGreaterThanOrEqual(ta.codes[ta.codes.length - 1].count);
  });
});

describe("Phase 3 — candidate themes", () => {
  const workload = (n: number, segment: string | null = null) =>
    Array.from({ length: n }, () => e("workload is too much, understaffed and rushed deadlines", segment));

  it("collates codes into candidate themes with a central organising concept", () => {
    const ta = analyseOpenText(workload(6), opts);
    const wl = ta.candidateThemes.find((t) => t.id === "ct-workload")!;
    expect(wl.prevalence).toBe(6);
    expect(wl.centralOrganisingConcept).toMatch(/capacity/i);
    expect(wl.codes.length).toBeGreaterThan(0);
    expect(wl.tone).toBe("negative");
  });

  it("never labels a candidate theme as a final/emergent theme (provisional name only)", () => {
    const ta = analyseOpenText(workload(6), opts);
    const wl = ta.candidateThemes.find((t) => t.id === "ct-workload")!;
    expect(wl.provisionalName).toBeTruthy();
    // The type carries no 'final'/'confirmed' field — these are candidates by construction.
    expect(Object.keys(wl)).not.toContain("confirmed");
  });

  it("flags thin themes (built on too few comments) rather than presenting them as themes", () => {
    const ta = analyseOpenText(
      [...workload(1), e("bureaucracy and red tape everywhere"), e("workload"), e("understaffed")],
      opts,
    );
    const proc = ta.candidateThemes.find((t) => t.id === "ct-process");
    if (proc) expect(proc.thin).toBe(true); // only 1 process mention → thin
  });

  it("breaks prevalence down by segment", () => {
    const ta = analyseOpenText([...workload(4, "Production"), ...workload(2, "Office")], opts);
    const wl = ta.candidateThemes.find((t) => t.id === "ct-workload")!;
    expect(wl.bySegment.find((s) => s.segment === "Production")!.count).toBe(4);
    expect(wl.bySegment.find((s) => s.segment === "Office")!.count).toBe(2);
    expect(wl.bySegment[0].segment).toBe("Production"); // sorted by count desc
  });
});

describe("anonymity gates on illustrative extracts", () => {
  const workload = (n: number) =>
    Array.from({ length: n }, () => e("workload too much, understaffed"));

  it("withholds all extracts unless verbatims are permitted", () => {
    const ta = analyseOpenText(workload(8), { reportingThreshold: 5, allowVerbatims: false });
    expect(ta.candidateThemes.find((t) => t.id === "ct-workload")!.illustrativeExtracts).toEqual([]);
  });

  it("shows extracts only when permitted AND both dataset and theme floors are met", () => {
    const ok = analyseOpenText(workload(8), { reportingThreshold: 5, allowVerbatims: true });
    expect(ok.candidateThemes.find((t) => t.id === "ct-workload")!.illustrativeExtracts.length).toBeGreaterThan(0);
    // Dataset below floor → nothing, even when permitted.
    const smallDataset = analyseOpenText(workload(4), { reportingThreshold: 5, allowVerbatims: true });
    expect(smallDataset.candidateThemes.find((t) => t.id === "ct-workload")!.illustrativeExtracts).toEqual([]);
  });

  it("suppresses a thin theme's extracts even in a large permitted dataset", () => {
    const entries = [
      ...workload(8),
      e("the tooling and systems are outdated"), // one lone process mention
    ];
    const ta = analyseOpenText(entries, { reportingThreshold: 5, allowVerbatims: true });
    const proc = ta.candidateThemes.find((t) => t.id === "ct-process");
    if (proc) expect(proc.illustrativeExtracts).toEqual([]); // theme count < MIN_THEME_FOR_QUOTE
  });

  it("redacts identifiers inside any extract it does show", () => {
    const entries = Array.from({ length: 8 }, () =>
      e("workload too much, contact boss@acme.com or 020 7946 0000"),
    );
    const q = analyseOpenText(entries, { reportingThreshold: 5, allowVerbatims: true }).candidateThemes.find(
      (t) => t.id === "ct-workload",
    )!.illustrativeExtracts;
    expect(q[0]).not.toMatch(/boss@acme\.com/);
    expect(q[0]).not.toMatch(/7946/);
    expect(q[0]).toMatch(/\[redacted\]/);
  });
});

describe("determinism", () => {
  it("produces identical output across runs on the same input", () => {
    const entries = [
      e("workload too much", "A"),
      e("unclear priorities and my manager micromanages", "B"),
      e("understaffed", "A"),
    ];
    const a = analyseOpenText(entries, opts);
    const b = analyseOpenText(entries, opts);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
