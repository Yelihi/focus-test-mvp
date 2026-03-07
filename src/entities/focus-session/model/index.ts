export type {
  FaceSignals,
  FocusState,
  FocusSegment,
  SessionSummary,
  SessionConfig,
  SessionHistoryEntry,
  StudyMode,
  BreakReason,
  BreakLog,
  SessionStatus,
  SessionGoal,
  ActivityLogEntry,
} from "./types";

export {
  DEFAULT_SESSION_CONFIG,
  COVERAGE_UPDATE_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  STATE_KEEPALIVE_MS,
  BREAK_REASON_LABELS,
  QUICK_BREAK_REASONS,
  DISTRACTED_ALERT_THRESHOLD_MS,
  COACHING_COOLDOWN_MS,
} from "./constants";
