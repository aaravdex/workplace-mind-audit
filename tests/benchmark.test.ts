import { describe, it, expect } from "vitest";
import {
  benchmarkBand,
  benchmarkResult,
  percentileOf,
  type PercentileDistribution,
} from "@/lib/benchmark";
import { MIN_COMPANIES_PER_BENCHMARK } from "@/lib/constants";

const dist: PercentileDistribution = {
  p10: 30,
  p25: 45,
  p50: 55,
  p75: 68,
  p90: 80,
};

describe("benchmark — min-companies guard", () => {
  it("refuses pools below the threshold", () => {
    expect(benchmarkResult(50, dist, MIN_COMPANIES_PER_BENCHMARK - 1)).toBeNull();
  });

  it("reports at exactly the threshold", () => {
    const r = benchmarkResult(50, dist, MIN_COMPANIES_PER_BENCHMARK);
    expect(r).not.toBeNull();
    expect(r?.nCompanies).toBe(MIN_COMPANIES_PER_BENCHMARK);
  });
});

describe("benchmark — banding", () => {
  it("classifies against the peer quartiles", () => {
    expect(benchmarkBand(40, dist)).toBe("bottom quartile"); // < p25
    expect(benchmarkBand(50, dist)).toBe("below median"); // < p50
    expect(benchmarkBand(60, dist)).toBe("above median"); // < p75
    expect(benchmarkBand(75, dist)).toBe("top quartile"); // >= p75
  });
});

describe("benchmark — percentile", () => {
  it("returns the anchor percentile exactly at each quartile", () => {
    expect(percentileOf(dist.p25, dist)).toBe(25);
    expect(percentileOf(dist.p50, dist)).toBe(50);
    expect(percentileOf(dist.p75, dist)).toBe(75);
  });

  it("is bounded and monotonic", () => {
    expect(percentileOf(0, dist)).toBe(0);
    expect(percentileOf(100, dist)).toBe(100);
    expect(percentileOf(40, dist)).toBeLessThan(percentileOf(60, dist));
  });
});
