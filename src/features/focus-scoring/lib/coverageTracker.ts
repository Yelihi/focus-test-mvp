import { COVERAGE_UPDATE_INTERVAL_MS } from "@/shared/config/timing";

export interface CoverageState {
  sessionStartMs: number;
  totalSamples: number;
  lastSampleMs: number;
  /** Gaps longer than this (ms) count as uncovered */
  gapThresholdMs: number;
  /** Total gap duration in ms */
  totalGapMs: number;
}

export function createCoverageTracker(
  sessionStartMs: number,
  expectedFps: number = 10,
): CoverageState {
  return {
    sessionStartMs,
    totalSamples: 0,
    lastSampleMs: sessionStartMs,
    gapThresholdMs: (1000 / expectedFps) * 3, // 3x expected interval = gap
    totalGapMs: 0,
  };
}

export function recordSample(state: CoverageState, timestampMs: number): void {
  if (state.totalSamples > 0) {
    const gap = timestampMs - state.lastSampleMs;
    if (gap > state.gapThresholdMs) {
      state.totalGapMs += gap - state.gapThresholdMs;
    }
  }
  state.totalSamples += 1;
  state.lastSampleMs = timestampMs;
}

export function getCoveragePercent(
  state: CoverageState,
  currentMs: number,
): number {
  const elapsed = currentMs - state.sessionStartMs;
  if (elapsed <= 0) return 100;
  const covered = elapsed - state.totalGapMs;
  return Math.max(0, Math.min(100, (covered / elapsed) * 100));
}

export function getEffectiveSampleRate(
  state: CoverageState,
  currentMs: number,
): number {
  const elapsed = (currentMs - state.sessionStartMs) / 1000;
  if (elapsed <= 0) return 0;
  return state.totalSamples / elapsed;
}
