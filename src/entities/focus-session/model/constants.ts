import type { SessionConfig } from "./types";

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  studyMode: "desktop",
  targetFps: 10,
  focusThreshold: 0.6,
  distractedThreshold: 0.3,
  hysteresisFrames: 5,
};

/** Coverage update interval in ms */
export const COVERAGE_UPDATE_INTERVAL_MS = 5_000;

/** Heartbeat interval for background detection */
export const HEARTBEAT_INTERVAL_MS = 500;

/** Keep-alive interval for state updates when no state change */
export const STATE_KEEPALIVE_MS = 1_000;
