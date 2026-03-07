import type {
  FaceSignals,
  FocusState,
  SessionConfig,
  SessionSummary,
  StudyMode,
} from "@/entities/focus-session";

// ── Main → Worker ──────────────────────────────────────────────

export interface SessionStartMessage {
  type: "SESSION_START";
  sessionId: string;
  config: SessionConfig;
}

export interface SignalsMessage {
  type: "SIGNALS";
  signals: FaceSignals;
}

export interface SessionStopMessage {
  type: "SESSION_STOP";
}

export interface SessionPauseMessage {
  type: "SESSION_PAUSE";
}

export interface SessionResumeMessage {
  type: "SESSION_RESUME";
}

export interface HeartbeatAckMessage {
  type: "HEARTBEAT_ACK";
  timestamp: number;
}

export interface StartHeartbeatMessage {
  type: "START_HEARTBEAT";
  intervalMs: number;
}

export interface StopHeartbeatMessage {
  type: "STOP_HEARTBEAT";
}

export interface ChangeModeMessage {
  type: "CHANGE_MODE";
  studyMode: StudyMode;
}

export type MainToWorkerMessage =
  | SessionStartMessage
  | SignalsMessage
  | SessionStopMessage
  | SessionPauseMessage
  | SessionResumeMessage
  | HeartbeatAckMessage
  | StartHeartbeatMessage
  | StopHeartbeatMessage
  | ChangeModeMessage;

// ── Worker → Main ──────────────────────────────────────────────

export interface WorkerReadyMessage {
  type: "WORKER_READY";
}

export interface StateUpdateMessage {
  type: "STATE_UPDATE";
  focusState: FocusState;
  focusScore: number;
  confidence: number;
}

export interface CoverageUpdateMessage {
  type: "COVERAGE_UPDATE";
  coveragePercent: number;
  effectiveSampleRateHz: number;
}

export interface SessionSummaryMessage {
  type: "SESSION_SUMMARY";
  summary: SessionSummary;
}

export interface HeartbeatTickMessage {
  type: "HEARTBEAT_TICK";
  timestamp: number;
}

export interface DistractedAlertMessage {
  type: "DISTRACTED_ALERT";
  distractedMs: number;
}

export type WorkerToMainMessage =
  | WorkerReadyMessage
  | StateUpdateMessage
  | CoverageUpdateMessage
  | SessionSummaryMessage
  | HeartbeatTickMessage
  | DistractedAlertMessage;
