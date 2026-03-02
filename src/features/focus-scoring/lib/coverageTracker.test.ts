import { describe, it, expect } from "vitest";
import {
  createCoverageTracker,
  recordSample,
  getCoveragePercent,
  getEffectiveSampleRate,
} from "./coverageTracker";

describe("coverageTracker", () => {
  it("starts at 100% coverage", () => {
    const tracker = createCoverageTracker(0, 10);
    expect(getCoveragePercent(tracker, 0)).toBe(100);
  });

  it("maintains 100% coverage with regular samples", () => {
    const tracker = createCoverageTracker(0, 10);
    // 10fps = 100ms intervals, gap threshold = 300ms
    for (let t = 100; t <= 1000; t += 100) {
      recordSample(tracker, t);
    }
    const coverage = getCoveragePercent(tracker, 1000);
    expect(coverage).toBe(100);
  });

  it("detects coverage gaps", () => {
    const tracker = createCoverageTracker(0, 10);
    recordSample(tracker, 100);
    // Large gap: 2000ms with no sample (threshold is 300ms)
    recordSample(tracker, 2100);
    const coverage = getCoveragePercent(tracker, 2100);
    expect(coverage).toBeLessThan(100);
  });

  it("computes effective sample rate", () => {
    const tracker = createCoverageTracker(0, 10);
    for (let t = 100; t <= 1000; t += 100) {
      recordSample(tracker, t);
    }
    const rate = getEffectiveSampleRate(tracker, 1000);
    expect(rate).toBe(10); // 10 samples in 1 second
  });

  it("returns 0 rate when no time has elapsed", () => {
    const tracker = createCoverageTracker(1000, 10);
    expect(getEffectiveSampleRate(tracker, 1000)).toBe(0);
  });
});
