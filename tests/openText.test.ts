import { describe, expect, it } from "vitest";
import { clusterOpenText, redactOpenText } from "@/lib/openText";

describe("redaction", () => {
  it("strips emails, phones, URLs, and @handles", () => {
    const r = redactOpenText("reach me at jo@acme.com, 020 7946 0000, https://x.io @jbloggs");
    expect(r).not.toMatch(/jo@acme\.com/);
    expect(r).not.toMatch(/7946/);
    expect(r).not.toMatch(/x\.io/);
    expect(r).not.toMatch(/@jbloggs/);
    expect(r).toMatch(/\[redacted\]/);
  });
});

describe("theme clustering", () => {
  const workload = (n: number) =>
    Array.from({ length: n }, () => ({
      text: "too much workload and impossible deadlines, understaffed",
      segment: null as string | null,
    }));

  it("clusters into themes with counts and sentiment", () => {
    const themes = clusterOpenText(workload(6), { reportingThreshold: 5, allowVerbatims: false });
    const wl = themes.find((t) => t.theme === "Workload & hours")!;
    expect(wl.count).toBe(6);
    expect(wl.sentiment).toBe("negative");
  });

  it("withholds verbatims unless permitted", () => {
    const themes = clusterOpenText(workload(6), { reportingThreshold: 5, allowVerbatims: false });
    expect(themes.find((t) => t.theme === "Workload & hours")!.sampleQuotes).toEqual([]);
  });

  it("shows redacted verbatims only when permitted AND the sample is large enough", () => {
    const ok = clusterOpenText(workload(6), { reportingThreshold: 5, allowVerbatims: true });
    expect(ok.find((t) => t.theme === "Workload & hours")!.sampleQuotes.length).toBeGreaterThan(0);
    // Below the sample floor, no verbatims even when permitted.
    const few = clusterOpenText(workload(3), { reportingThreshold: 5, allowVerbatims: true });
    expect(few.find((t) => t.theme === "Workload & hours")!.sampleQuotes).toEqual([]);
  });

  it("redacts identifiers inside any verbatim it does show", () => {
    const entries = Array.from({ length: 6 }, () => ({
      text: "workload too much, email boss@x.com",
      segment: null as string | null,
    }));
    const q = clusterOpenText(entries, { reportingThreshold: 5, allowVerbatims: true }).find(
      (t) => t.theme === "Workload & hours",
    )!.sampleQuotes;
    expect(q[0]).not.toMatch(/boss@x\.com/);
    expect(q[0]).toMatch(/\[redacted\]/);
  });
});
