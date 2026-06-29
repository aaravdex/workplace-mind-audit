import { describe, it, expect } from "vitest";
import { recommendations } from "@/lib/recommendations";
import type { DimensionScores } from "@/types";

const dims = (o: Partial<DimensionScores>): DimensionScores => ({
  capacity: null,
  clarity: null,
  control: null,
  connection: null,
  confidence: null,
  ...o,
});

describe("recommendations", () => {
  it("returns nothing when every dimension is Healthy/Watch", () => {
    const recs = recommendations(
      dims({
        capacity: 85,
        clarity: 75,
        control: 80,
        connection: 90,
        confidence: 65,
      }),
    );
    expect(recs).toHaveLength(0);
  });

  it("includes only Risk/Critical dimensions, worst score first", () => {
    const recs = recommendations(
      dims({
        capacity: 30, // Critical
        clarity: 55, // Risk
        control: 45, // Risk
        connection: 80, // Healthy
        confidence: 75, // Watch
      }),
    );
    expect(recs.map((r) => r.dimension)).toEqual([
      "capacity",
      "control",
      "clarity",
    ]);
    expect(recs[0].band).toBe("Critical");
  });

  it("skips dimensions with no data (null)", () => {
    expect(recommendations(dims({ capacity: null, clarity: 30 }))).toHaveLength(
      1,
    );
  });

  it("each recommendation carries a title and three concrete actions", () => {
    const recs = recommendations(dims({ connection: 20 }));
    expect(recs[0].title.length).toBeGreaterThan(0);
    expect(recs[0].actions).toHaveLength(3);
  });
});
