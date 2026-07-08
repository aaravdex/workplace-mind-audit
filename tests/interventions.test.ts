import { describe, expect, it } from "vitest";
import { INTERVENTIONS } from "@/data/interventions/library";
import { isValidIntervention, validateIntervention } from "@/lib/interventions/schema";
import { FACTORS_BY_ID } from "@/content/factors";

describe("intervention library integrity", () => {
  it("every intervention passes the quality gate", () => {
    for (const i of INTERVENTIONS) {
      expect(validateIntervention(i), `${i.interventionId}`).toEqual([]);
    }
  });

  it("has unique intervention ids", () => {
    const ids = INTERVENTIONS.map((i) => i.interventionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references only real factor ids", () => {
    for (const i of INTERVENTIONS)
      for (const fid of i.factorIds) expect(FACTORS_BY_ID.has(fid)).toBe(true);
  });

  it("declares dependencies that exist in the library", () => {
    const ids = new Set(INTERVENTIONS.map((i) => i.interventionId));
    for (const i of INTERVENTIONS)
      for (const dep of i.dependencies) expect(ids.has(dep)).toBe(true);
  });

  it("includes primary (change-the-work) interventions", () => {
    expect(INTERVENTIONS.some((i) => i.interventionLevel === "primary")).toBe(true);
  });
});

describe("quality gate rejects incomplete or vague interventions", () => {
  const good = INTERVENTIONS[0];

  it("rejects missing steps", () => {
    expect(isValidIntervention({ ...good, implementationSteps: [] })).toBe(false);
  });

  it('rejects an accountable owner of just "HR"', () => {
    expect(
      isValidIntervention({
        ...good,
        raciTemplate: { ...good.raciTemplate, accountable: "HR" },
      }),
    ).toBe(false);
  });

  it("rejects missing success criteria / stop rules", () => {
    expect(isValidIntervention({ ...good, successCriteria: [] })).toBe(false);
    expect(isValidIntervention({ ...good, stopRules: [] })).toBe(false);
  });

  it("rejects vague standalone actions", () => {
    const bad = {
      ...good,
      implementationSteps: [{ ...good.implementationSteps[0], actions: ["reduce workload"] }],
    };
    expect(isValidIntervention(bad)).toBe(false);
    expect(validateIntervention(bad).some((p) => /vague action/i.test(p))).toBe(true);
  });
});
