import type { SessionConfig, BreakReason } from "./types";

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  studyMode: "work",
  targetFps: 10,
  focusThreshold: 0.6,
  distractedThreshold: 0.3,
  hysteresisFrames: 3,
};

/** Coverage update interval in ms */
export const COVERAGE_UPDATE_INTERVAL_MS = 5_000;

/** Heartbeat interval for background detection */
export const HEARTBEAT_INTERVAL_MS = 500;

/** Keep-alive interval for state updates when no state change */
export const STATE_KEEPALIVE_MS = 1_000;

/** Korean labels for break reasons */
export const BREAK_REASON_LABELS: Record<BreakReason, string> = {
  phone: "전화",
  bathroom: "화장실",
  sns: "SNS",
  news: "뉴스",
  colleague: "동료",
  fatigue: "피로",
  other: "기타",
};

/** Quick break reasons that show simplified UI */
export const QUICK_BREAK_REASONS: BreakReason[] = ["phone", "bathroom"];

/** How long user must stay distracted before alert (ms) */
export const DISTRACTED_ALERT_THRESHOLD_MS = 20_000;

/** Cooldown between coaching toasts (ms) */
export const COACHING_COOLDOWN_MS = 60_000;
