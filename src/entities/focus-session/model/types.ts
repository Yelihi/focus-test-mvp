/** Raw signals extracted from MediaPipe face landmarks */
export interface FaceSignals {
  /** Eye aspect ratio (EAR) for blink detection, 0-1 */
  earLeft: number;
  earRight: number;
  /** Blendshape scores from MediaPipe, 0-1 */
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  eyeLookInLeft: number;
  eyeLookInRight: number;
  eyeLookOutLeft: number;
  eyeLookOutRight: number;
  /** Head pose in degrees */
  headYaw: number;
  headPitch: number;
  headRoll: number;
  /** Face detection confidence, 0-1 */
  faceDetectionConfidence: number;
  /** Timestamp in ms */
  timestamp: number;
}

/** Focus state derived from scoring */
export type FocusState = "focused" | "distracted" | "absent";

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
}

/** Study mode: work (screen) or reading (looking down) */
export type StudyMode = "work" | "reading";

/** Reason for taking a break */
export type BreakReason = "phone" | "bathroom" | "sns" | "news" | "colleague" | "fatigue" | "other";

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

/** Session lifecycle status */
export type SessionStatus = "idle" | "running" | "break" | "stopped";

/** Goal for a session */
export interface SessionGoal {
  targetHours: number;
  targetMinutes: number;
  targetFocusPercent: number;
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
