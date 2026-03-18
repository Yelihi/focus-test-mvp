/** Focus state derived from scoring */
export type FocusState = "focused" | "distracted" | "absent";

/** Study mode: work (screen) or reading (looking down) */
export type StudyMode = "work" | "reading";

/** Reason for taking a break */
export type BreakReason = "phone" | "bathroom" | "sns" | "news" | "colleague" | "fatigue" | "other";

/** Session lifecycle status */
export type SessionStatus = "idle" | "running" | "break" | "stopped";

/** State for timetable visualization */
export type TimetableState = FocusState | "break";

/** A segment of continuous focus state */
export interface FocusSegment {
  state: FocusState;
  startMs: number;
  endMs: number;
  avgScore: number;
}

/** Session summary produced at session end */
export interface SessionSummary {
  sessionId: string;
  durationMs: number;
  focusPercent: number;
  distractedPercent: number;
  absentPercent: number;
  segments: FocusSegment[];
  coveragePercent: number;
  effectiveSampleRateHz: number;
  breakCount: number;
  breaks: BreakLog[];
  longestContinuousFocusMs: number;
  totalBreakMs: number;
  avgRecoveryMs: number;
}

/** A single session history entry for list display */
export interface SessionHistoryEntry {
  sessionId: string;
  startedAt: number;
  endedAt: number;
  status: "stopped";
  durationMs: number;
  focusedMs: number;
  focusPercent: number;
  breakCount: number;
  breaks: BreakLog[];
  goal?: SessionGoal;
  dailyGoalText?: string;
  memo?: string;
}

/** A timetable entry — endTime is the next entry's startTime (or Date.now() for the last) */
export interface TimetableEntry {
  state: TimetableState;
  startTime: number;
}

/** A single break log entry */
export interface BreakLog {
  breakId: string;
  reason: BreakReason;
  memo?: string;
  firstStep: string;
  timerMinutes?: number;
  startedAt: number;
  resumedAt?: number;
  recoveryMs?: number;
}

/** Goal for a session */
export interface SessionGoal {
  targetHours: number;
  targetMinutes: number;
  targetFocusPercent: number;
  dailyGoalText?: string;
}

/** Activity log entry for timeline display */
export interface ActivityLogEntry {
  id: string;
  type: 'session_start' | 'session_stop' | 'break_start' | 'break_end' | 'distracted';
  timestamp: number;
  message: string;
}

/** Session configuration */
export interface SessionConfig {
  /** Study mode affects scoring parameters (default: "desktop") */
  studyMode: StudyMode;
  /** Target capture rate in fps (default: 10) */
  targetFps: number;
  /** Scoring thresholds */
  focusThreshold: number;
  distractedThreshold: number;
  /** Hysteresis: min consecutive frames to trigger state change */
  hysteresisFrames: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  studyMode: "work",
  targetFps: 10,
  focusThreshold: 0.6,
  distractedThreshold: 0.3,
  hysteresisFrames: 3,
};
