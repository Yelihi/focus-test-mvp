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
}

/** A single session history entry for list display */
export interface SessionHistoryEntry {
  sessionId: string;
  startedAt: number; // Date.now() — session start wall-clock
  endedAt: number; // Date.now() — session end (pause) wall-clock
  status: "paused" | "stopped";
  durationMs: number;
  focusedMs: number; // focusPercent / 100 * durationMs
  focusPercent: number;
}

/** Study mode: desktop (screen) or book (looking down) */
export type StudyMode = "desktop" | "book";

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
